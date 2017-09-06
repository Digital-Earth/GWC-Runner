var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function discoverUrl(url) {
	var jobDetails = {
		'cwd': config.cli.cwd,
		'exec': config.cli.exec,
		'args': ['url','discover',url],
		'name': 'discover ' + url,
		'info': {
			type: 'discover',
			url: url
		}
	};

	return new Job(jobDetails);
}

module.exports = discoverUrl;