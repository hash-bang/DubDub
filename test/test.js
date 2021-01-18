var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');

describe('DubDub - basic test environment', ()=>

	it('should process a simple test environment', ()=>
		exec([
			// NOTE: Because of shell escaping insanity RegEx escapes have to be doubled e.g. '\d' => '\\d'
			'./app.js',
			`--from=${__dirname}/data/basic`,
			'--to=/eg',
			'--debug',
			'--stop-unmatched',
			'--rule=s!^(?<base>.+)\\.jpg$!images/${base}.jpg!',
			'--rule=s!^scene(?<sceneNo>\\d+)-(?<part>\\d+)-(?<subPart>\\d+)\\.mp4!scenes/${sceneNo}/${part}/${subPart}.mp4!',
		], {buffer: true, logStderr: true})
			.then(wouldPerform => expect(wouldPerform.split(/\n/)).to.deep.equal([
				'mkdir /eg/images',
				'mkdir /eg/scenes/01/01',
				'mkdir /eg/scenes/01/02',
				'mkdir /eg/scenes/01/03',
				'mv 001.jpg /eg/images/001.jpg',
				'mv 002.jpg /eg/images/002.jpg',
				'mv 003.jpg /eg/images/003.jpg',
				'mv scene01-01-01.mp4 /eg/scenes/01/01/01.mp4',
				'mv scene01-01-02.mp4 /eg/scenes/01/01/02.mp4',
				'mv scene01-01-03.mp4 /eg/scenes/01/01/03.mp4',
				'mv scene01-02-01.mp4 /eg/scenes/01/02/01.mp4',
				'mv scene01-02-02.mp4 /eg/scenes/01/02/02.mp4',
				'mv scene01-02-03.mp4 /eg/scenes/01/02/03.mp4',
				'mv scene01-03-01.mp4 /eg/scenes/01/03/01.mp4',
				'mv scene01-03-02.mp4 /eg/scenes/01/03/02.mp4',
				'mv scene01-03-03.mp4 /eg/scenes/01/03/03.mp4',
			]))
	)

);
