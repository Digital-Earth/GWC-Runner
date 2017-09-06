var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function validateUrl(url) {
	var jobDetails = {
		'cwd': config.cli.cwd,
		'exec': config.cli.exec,
		'args': ['url','validate','-n=50',url],
		'on': {
			'exit': function(job) {
				if (job.info.datasets > 0) {
					JobManager.performJob(validateUrl(url));
				}
			}
		},
		'name': 'validate ' + url,
		'info': {
			type: 'validate',
			url: url
		}
	};

	return new Job(jobDetails);
}

module.exports = validateUrl;