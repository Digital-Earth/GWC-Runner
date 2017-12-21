var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function validateUrl(url) {
	var jobDetails = {
		'cwd': config.cli.cwd,
		'exec': config.cli.exec,
		'args': ['url','validate','-n=50', '-clean',url],
		'on': {
			'exit': function(job) {
                if (job.info.root) {
                    let root = job.info.root;
                    JobManager.roots.forEach((url) => {
                        if (url.url === root.Uri) {
                            url.status = root.Status;
                            url.datasets = root.DataSetCount;
                            url.working = Math.round(100 * root.VerifiedDataSetCount / root.DataSetCount);
                            url.broken = root.BrokenDataSetCount;
                            url.verified = root.VerifiedDataSetCount;
							url.unknown =root.UnknownDataSetCount;
							url.lastDiscovered = new Date(root.LastDiscovered);
							url.lastVerified = new Date(root.LastVerified);
                        }

                    });

                    JobManager.updateRoots(JobManager.roots);
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