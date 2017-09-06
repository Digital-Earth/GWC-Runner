var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function addUrl(url) {
	var jobDetails = {
		'cwd': config.cli.cwd,
		'exec': config.cli.exec,
		'args': ['url','add',url],
		'name': 'add ' + url,
		'info': {
			type: 'add',
			url: url
		}
	};

	return new Job(jobDetails);
}

module.exports = addUrl;