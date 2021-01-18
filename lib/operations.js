var fs = require('fs');
var fspath = require('path');

/**
* Operation workers
* These are wrapped versions of FS promisables which just print the shell command if we're in dry-run mode
* @param {Commander} program Commander instance of the main program - used to determine if we're in dry-run mode
* @returns {Object} A lookup object of operations that we can perform
*/
module.exports = program => {
	var operations = {
		/**
		* Wrapper for path.dirname()
		* @alias path.dirname
		*/
		dirname: fspath.dirname,


		/**
		* Escape shell paths
		* Adds speachmarks around paths if needed, escaping other speachmarks
		* @param {string} path Input path to escape
		*/
		escape: input => /[\s'"]/.test(input) // If we have any whitespace or speachmarks...
			? "'" + input.replace(/'/g, "\\'") + "'" // Wrap in single speachmarks, escaping existing ones
			: input, // Use shell safe name as-is


		/**
		* Wrapper for path.join()
		* @alias path.join
		*/
		join: fspath.join,


		/**
		* Wrapper for fs.mkdir with recursive creation
		* @param {string} path Recursive path to create
		* @returns {Promise} A promise which will resolve when the directory has been created
		*/
		mkdirp(path) {
			return program.dryrun
				? Promise.resolve(console.log('mkdir', operations.escape(path)))
				: fs.promises.mkdir(path, {recursive: true})
		},


		/**
		* Move a file from src -> dst
		* NOTE: This will fail on cross-device moves because POSIX rename is not a stream copy. Bribe MC if you want to know how to support this
		* @param {string} src Source file path
		* @param {string} dst Destination file path
		* @returns {Promise} A promise when the file has been moved
		*/
		move(src, dst) {
			return program.dryrun
				? Promise.resolve(console.log('mv', operations.escape(src), operations.escape(dst)))
				: fs.promises.rename(src, dst)
		},
	};

	return operations;
};
