#!/usr/bin/env node

/**
* DubDub
* Shell script to apply RegEx renames in a logical order while moving files
* This script is designed to be used as a standalone, via Cron or via a Samba action hook
*
* @author Matt Carter <m@ttcarter.com>
* @date 2021-01-11
*/

var glob = require('globby');
var program = require('commander'); require('commander-extras');
Promise.allLimit = require('./lib/promise.alllimit');
var template = require('@momsfriendlydevco/template');

program
	.name('dubdub')
	.version(require('./package.json').version)
	.usage('[--from=path] --to=path')
	.option('--from [path]', 'source base path (default is $PWD)')
	.option('--to [path]', 'destination base path')
	.option('--glob [expression]', 'alternative glob expression', '*')
	.option('--rule [s/FROM/TO/]', 'rule to apply, can be specified multiple times to append rules', (val, total) => total.concat([val]), [])
	.option('-p, --parallal [threads]', 'maximum number of operations to execute at once', 3)
	.option('-n, --dryrun', 'dont actually do anything, just output the shell commands that would run')
	.option('-v, --verbose', 'increase verbosity, specify multiple times for more chatter', (val, total) => val++, 0)
	.option('--debug', 'alias for --parallel=1 --dryrun')
	.option('--stop-unmatched', 'error out if any globbed files do not match any rules')
	.note('Glob expressions can contain Globstars, match groups, exclusions and anything else supported by Minimatch - https://github.com/isaacs/minimatch')
	.note('Only renames files on the same device - this is due to POSIX limitations, cross-file moving can be supported in future though')
	.note('--rule accepts any seperator character in the Perl style e.g. --rule=s!foo.jpg!bar/foo.jpg! to make things easier to read with Unix paths')
	.example('dubdub --to /shares/files', 'Apply default rename rules and move to /shares/files')
	.example('dubdub --from /shares/upload --to /shares/files', 'Accept files in one directory and transfer to another')
	.example('dubdub --from /shares/upload --to /shares/files --rule \'s!?(<base>.+)\.jpg!misc/${base}!\'', 'Rename JPG files into /misc')
	.example('dubdub --from /shares/upload --to /shares/files --rule \'s!^scene(?<sceneNo>\\d+)-(?<part>\\d+).mp4!scenes/${sceneNo}/${part}.mp4!\'', 'Place scenes into seperate directories based on naming')
	.parse(process.argv);


/**
* Create operations library using program setup (uses program.dryrun to fake actual operations)
* This library is actually a merge of require('fs') + require('path') with the subset of stuff we're interested in
* @type {Object<function>} Library of functions
*/
var operations = require('./lib/operations')(program);


/**
* List of rename rules to apply in order - first matching expression wins with others ignored
* @type {array<Object>} Collection of rename patterns
* @property {RegExp} from RegExp to apply, used to also detect path eligibility
* @property {string} to Destination path to rewrite to, can use ES6 templates
* @property {Template} templateTo Compiled version of `to` via @mfdc/template - used to optimize runtime after all rules are ready
*/
var rules = [
	// {from: /^(?<base>.+)\.jpg$/i, to: '${base}-image.jpg'},
];

Promise.resolve()
	.then(()=> { // Sanity checks + Rule compile {{{
		if (!program.to) throw new Error('--to must be specified');
		if (program.debug) [program.parallel, program.dryrun] = [1, true];

		// Process incoming rules from CLI
		if (!rules.length && !program.rule.length) {
			throw new Error('No rules are specified!');
		} else if (program.rule) { // Accept CLI rules
			rules = rules.concat(program.rule.map(rule => {
				// This is pretty horrifying but its basically a RegEx that parses RegEx - its turtles all the way down!
				var ruleParts = /^s(?<seperator>.)(?<from>.+?)\k<seperator>(?<to>.+)\k<seperator>$/.exec(rule);
				if (!ruleParts) throw new Error(`Invalid rule "${rule}"`);
				return {
					from: new RegExp(ruleParts.groups.from),
					to: ruleParts.groups.to
				};
			}));
		}

		// Compile rules
		rules = rules.map(rule => ({...rule, templateTo: template.compile(rule.to)}));

		if (program.verbose >= 3) console.error('Settings', {from: program.from, to: program.to, rules: program.rules, parallel: program.parallel, dryrun: program.dryrun});
	}) // }}}
	.then(()=> program.from && process.chdir(program.from)) // Move to from dir if specified
	.then(()=> glob(program.glob))
	.then(items => items.length ? items : Promise.reject('No files found'))
	.then(items => items.map(item => ({ // Remap file paths into {pathFrom<String>, rule<RegExpResult>}
		pathFrom: item,
		rule: rules.find(rule => rule.from.test(item)),
	})))
	.then(items => program.stopUnmatched && Promise.all(items.map(item => item.rule // Die if we're being fussy and some files dont match a rule
		? item
		: Promise.reject(`File '${path.pathFrom}' did not match any rule - aborting!`)
	)))
	.then(items => items // Remap file paths into {path<string>, rule<RegExpResult>, to<String>} {{{
		.filter(item => item.rule) // Remove dead paths
		.map(item => ({
			...item,
			pathTo: operations.join( // Compile pathTo into our destination
				program.to, // To destination prefix
				item.rule.templateTo(item.rule.from.exec(item.pathFrom).groups), // Exec template via ES6 templator returning output string
			),
		}))
	) // }}}
	.then(items => { // Create parent directories for all pathTo mappings (running via a Set so we don't headcrash)
		var dirs = new Set(items.map(item => operations.dirname(item.pathTo)));

		return Promise.allLimit(program.parallel, Array.from(dirs).map(dir => ()=> operations.mkdirp(dir))) // Queue up dir creation
			.then(()=> items); // Pass original pipeline onwards
	})
	.then(items => Promise.allLimit(program.parallel, // Move files
		items.map(item => ()=> operations.move(item.pathFrom, item.pathTo))
	))
	.catch(e => { // Handle errors {{{
		console.error('ERROR:', e.toString());
		process.exit(1);
	}) // }}}
