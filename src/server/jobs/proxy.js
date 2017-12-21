var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function startProxy(url) {
	var jobDetails = {
		cwd: config.proxy.cwd,
		exec: config.proxy.exec,
		args: [config.proxy.start, url],
		name: 'proxy ' + url,
		info: {
			type: 'proxy',
			url: url
		},
		on: {
			'exit': function(job) {
				if (config.proxy.keepAlive) {
					JobManager.performJob(startProxy(url));
				}
			}
		}
	};

	return new Job(jobDetails);
}

module.exports = startProxy;