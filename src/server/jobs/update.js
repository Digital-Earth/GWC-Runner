var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function updateUrl(url, status) {
	var jobDetails = {
		cwd: config.cli.cwd,
		exec: config.cli.exec,
		args: ['url', 'update', '-status=' + status, url],
		name: 'update ' + url,
		info: {
			type: 'update',
			url: url,
			status: status
		},
	};

	return new Job(jobDetails);
}

module.exports = updateUrl;