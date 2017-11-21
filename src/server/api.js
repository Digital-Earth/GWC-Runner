var Job = require('./Job');
var JobManager = require('./JobManager');
var config = require('./config');

var Jobs = {
	addUrl: require('./jobs/add'),
	listUrls: require('./jobs/list'),
	validateUrl: require('./jobs/validate'),
	discoverUrl: require('./jobs/discover'),
	startGwc: require('./jobs/gwc')
}

var Api = {}

Api.attach = function (server) {
	console.log('setup socket.io API');

	var io = require('socket.io')(server);

	function transformJob(job) {
		return  {
			id: job.id,
			name: job.name,
			status: job.status,
			usage: job.usage || { cpu: 0, memory:0},
			info: job.info || {},
			log: job.logParser.logTail || []
		}
	}

	function sendJobsUpdate() {
		io.emit('jobs', JobManager.jobs.map(transformJob));
		io.emit('urls',JobManager.urls || []);
		io.emit('gallery-status',JobManager.geoSources || []);
	}

	function sendJobUpdate(job) {
		io.emit('job-update', transformJob(job));
	}

	JobManager.on('job-started',function(job) {
		io.emit('job-update', transformJob(job));
		job.on('usage', sendJobUpdate)
		job.on('info', sendJobUpdate)
	});
	JobManager.on('job-completed',function(job) {
		io.emit('job-update', transformJob(job));
		job.off('usage', sendJobUpdate);
		job.off('info', sendJobUpdate)
	})

	io.on('connection', (socket) => {
		console.log('connected')
		sendJobsUpdate();

		socket.on('kill-job', function(jobId) {
			JobManager.killJobWithId(jobId);
		});

		socket.on('start-add-url', function(url) {
			var job = Jobs.addUrl(url);
			JobManager.performJob(job);

			//auto invoke discover
			job.on('exit', function (job) {
				if (job.data.urls) {
					var urlReport = job.data.urls[0];
					if (urlReport && urlReport.Status == 'New') {
						JobManager.performJob(Jobs.discoverUrl(url));
					}
				}
			});
		})

		socket.on('start-validate', function(url) {
			JobManager.performJob(Jobs.validateUrl(url));
		})

		socket.on('start-discover', function(url) {
			JobManager.performJob(Jobs.discoverUrl(url));
		})

		socket.on('start-list', function(url) {
			var job = Jobs.listUrls();
			JobManager.performJob(job);
			job.on('exit', function() {
				io.emit('urls',JobManager.urls || []);
			})
		})

		socket.on('start-gwc', function() {
			Api.startGwc();
		});

		socket.on('stop-gwc', function() {
			Api.stopGwc();
		});

		/* BEGIN - ALL LEGACY STUFF - CONSIDER REFACTOR */

		socket.on('start-download-geosource', function(id) {
			JobManager.performJob(Jobs.startGwc('download-geosource','pyxis://'+id));
		});

		socket.on('start-import-geosource', function(id) {
			JobManager.performJob(Jobs.startGwc('import-geosource','pyxis://'+id));
		});

		socket.on('start-gallery-status', function(id) {
			var job = Jobs.startGwc('gallery-status',id);
			JobManager.performJob(job);

			job.on('exit', function() {
				io.emit('gallery-status',JobManager.geoSources || []);
			})
		});

		/* END - ALL LEGACY STUFF */		
	});
}

Api.startGwc = function() {
	config.gwc.keepAlive = true;
	if (JobManager.find({gwc:true}).length == 0) {
		['master','server','import'].forEach(function(type) {
			config.gwc[type + 'Ports'].forEach(function(port,index) {
				JobManager.performJob(Jobs.startGwc(type,index));
			});
		});
	}
}

Api.stopGwc = function() {
	config.gwc.keepAlive = false;
	JobManager.find({gwc:true}).forEach(job=>job.kill());
}

module.exports = Api;