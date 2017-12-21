var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function listUrls(url) {
	let jobDetails = {
		'cwd': config.cli.cwd,
		'exec': config.cli.exec,
        'args': ['url', 'list', '-json'],
		'on': {
            'exit': function (job) {
                let urls = job.data.roots.map((root) => {
                    return {
                        url: root.Uri,
                        status: root.Status,
                        datasets: root.DataSetCount,
                        working: Math.round(100 * root.VerifiedDataSetCount / root.DataSetCount),
						broken: root.BrokenDataSetCount,
						verified: root.VerifiedDataSetCount,
						unknown: root.UnknownDataSetCount,
						lastDiscovered: new Date(root.LastDiscovered),
						lastVerified: new Date(root.LastVerified)
                    }
                });
				job.info.urls = urls.length;
				JobManager.updateRoots(urls);
			}
		},
		'info': {
			type: 'list',
		}
	};

	return new Job(jobDetails);
}

module.exports = listUrls;