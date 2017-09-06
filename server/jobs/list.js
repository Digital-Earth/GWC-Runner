var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function listUrls(url) {
	var urls = [];

	var jobDetails = {
		'cwd': config.cli.cwd,
		'exec': config.cli.exec,
		'args': ['url','list'],
		'on': {
			'line': function(job,line) {
				//https://gis.calgary.ca/arcgis/rest/services/ : Discovered (77% working of 208 DataSets / 30 Broken)
				var groups = line.match(/^(\S+) : (\S+) \((\d+)% working of (\d+) DataSets \/ (\d+) Broken\)/);
				if (groups) {
					var url = {
						url: groups[1],
						status: groups[2],
						working: groups[3],
						datasets: groups[4],
						broken: groups[5]
					};
					urls.push(url);
					console.log(url);
				}
			},
			'exit': function(job) {
				job.info.urls = urls.length;
				JobManager.urls = urls;
			}
		},
		'info': {
			type: 'list',
		}
	};

	return new Job(jobDetails);
}

module.exports = listUrls;