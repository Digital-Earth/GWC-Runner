var Job = require('../Job');
var config = require('../config');

function createDetails(type, id) {
	var url = config.gwc.host + ":";

	var jobDetails = {
		'cwd': config.gwc.cwd,
		'exec': config.gwc.exec,
		'args': ['-fd=' + config.gwc.filesFolder, '-cd=' + config.gwc.cacheFolder],
		'killCommand': 'x',
		'name': 'GWC',
		'state': {
			type: type,
		}
	};

	switch (type) {
		case 'master':
			url = config.gwc.masterHost + ':' + config.gwc.masterPorts[id]
			jobDetails.state.gwc = true;
			break;
		case 'server':
			url += config.gwc.serverPorts[id]
			jobDetails.state.gwc = true;
			break;
		case 'import':
			url += config.gwc.importPorts[id]
			jobDetails.state.gwc = true;
			break;
		case 'validate-checksum':
			url = '';
			jobDetails.args.push('-vc');
			break;
		case 'import-geosource':
			url = id;
			jobDetails.args.push('-import');
			break;
		case 'download-geosource':
			jobDetails.args.push('-d');
			url = id;
			break;
		case 'gallery-status':
			jobDetails.args.push('-gs');
			if (id) {
				jobDetails.args.push('pyxis://' + id);
			}
			url = '';
			break;
		default:
			throw "Unsupported GWC type: " + type;
	}

	if (url) {
		jobDetails.name += ' ' + url;
		jobDetails.state.url = url;
		jobDetails.endpoints = {
			'api': url
		}
	}

	if (config.production) {
		jobDetails.args.push('-env=Production')
	}

	if (type !== 'master') {
		jobDetails.args.push('-master=' + config.gwc.masterHost + ':' + config.gwc.masterPorts[0])
	}

	jobDetails.args.push(url);
	
	return jobDetails;
}

module.exports = createDetails;