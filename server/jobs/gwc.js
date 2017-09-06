var Job = require('../Job');
var JobManager = require('../JobManager');
var config = require('../config');

function startGWC(type, id) {
	var url = config.gwc.host + ":";

	var jobDetails = {
		'cwd': config.gwc.cwd,
		'exec': config.gwc.exec,
		'args': ['-fd=' + config.gwc.filesFolder, '-cd=' + config.gwc.cacheFolder],
		'killCommand': 'x',
		'on': {
			'usage': function (job) {
				if (job.info.idleFrom && job.status === 'running') {
					var minutes = (Date.now() - new Date(job.info.idleFrom)) / 1000 / 30;
					var mb = job.usage.memory / 1024 / 1024;

					if (minutes > config.gwc.safeIdleTimeInMinutes && mb > config.gwc.memoryLimitInMB) {
						job.kill();
					}
				}
			},
			'exit': function (job) {
				if (config.gwc.keepAlive) {
					JobManager.performJob(startGWC(type, id));
				}
			}
		},
		'name': 'GWC',
		'info': {
			type: type,
			gwc: true,
		}
	};

	switch (type) {
		case 'master':
			url = config.gwc.masterHost + ':' + config.gwc.masterPorts[id]
			break;
		case 'server':
			url += config.gwc.serverPorts[id]
			break;
		case 'import':
			url += config.gwc.importPorts[id]
			break;
		case 'validate-checksum':
			url = '';
			jobDetails.args.push('-vc');
			delete jobDetails.on.exit;
			break;
		case 'import-geosource':
			url = id;
			jobDetails.args.push('-import');
			delete jobDetails.on.exit;
			break;
		case 'download-geosource':
			jobDetails.args.push('-d');
			delete jobDetails.on.exit;
			url = id;
			break;
		case 'gallery-status':
			jobDetails.args.push('-gs');
			url = '';
			jobDetails.on.automation = function (job, command, key, value) {
				if (command == 'PUSH') {
					job.data = job.data || {};
					job.data[key] = job.data[key] || [];
					job.data[key].push(value);
				}
			}
			jobDetails.on.exit = function (job) {
				JobManager.geoSources = job.data.geoSources;
			}
			break;
		default:
			throw "Unsupported GWC type: " + type;
	}

	jobDetails.name += ' ' + url;
	jobDetails.info.url = url;

	if (config.production) {
		jobDetails.args.push('-env=Production')
	}

	if (type !== 'master') {
		jobDetails.args.push('-master=' + config.gwc.masterHost + ':' + config.gwc.masterPorts[0])
	}

	jobDetails.args.push(url);

	return new Job(jobDetails);
}

module.exports = startGWC;