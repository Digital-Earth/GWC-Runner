var Job = require('./Job');
var JobManager = require('./JobManager');
var config = require('./config');

var Jobs = {
	addUrl: require('./jobs/add'),
	listUrls: require('./jobs/list'),
	validateUrl: require('./jobs/validate'),
	updateUrl: require('./jobs/update'),
	discoverUrl: require('./jobs/discover'),
	startGwc: require('./jobs/gwc'),
	startProxy: require('./jobs/proxy')
}

var Api = {}

Api.attach = function (server, app) {
	console.log('setup socket.io API');

	var io = require('socket.io')(server);

	function transformJob(job) {
		return {
			id: job.id,
			name: job.name,
			status: job.status,
			usage: job.usage || { cpu: 0, memory: 0 },
			info: job.info || {},
			log: job.logParser.logTail || []
		}
	}

	function sendJobsUpdate() {
		io.emit('jobs', JobManager.jobs.map(transformJob));
		io.emit('urls', JobManager.roots || []);
		io.emit('gallery-status', JobManager.geoSources || []);
	}

	function sendJobUpdate(job) {
		io.emit('job-update', transformJob(job));
	}

	JobManager.on('job-started', function (job) {
		io.emit('job-update', transformJob(job));
		job.on('usage', sendJobUpdate)
		job.on('info', sendJobUpdate)
	});
	JobManager.on('job-completed', function (job) {
		io.emit('job-update', transformJob(job));
		job.off('usage', sendJobUpdate);
		job.off('info', sendJobUpdate)
	})

	JobManager.on('roots-updated', function () {
		io.emit('urls', JobManager.roots || []);
	});

	io.on('connection', (socket) => {
		console.log('connected')
		sendJobsUpdate();

		socket.on('kill-job', function (jobId) {
			JobManager.killJobWithId(jobId);
		});

		socket.on('start-add-url', function (url) {
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

		function startValidationJob(url, onDone) {
			onDone = onDone || function () { };

			let job = Jobs.validateUrl(url);

			job.on('exit', function (job) {
				if (!job.info.root) {
					let updateStatusJob = Jobs.updateUrl(url,'Broken');
					updateStatusJob.on('exit',onDone);
					JobManager.performJob(updateStatusJob);
				}
				else if (job.info.datasets > 0) {
					startValidationJob(url, onDone);
				} else {
					onDone();
				}
			});

			JobManager.performJob(job);
		}

		socket.on('start-validate', function (url) {
			startValidationJob(url);
		})

		socket.on('start-discover', function (url) {
			JobManager.performJob(Jobs.discoverUrl(url));
		})

		socket.on('start-discover-and-validate', function (urls) {
			function discoverNextUrl() {
				if (urls.length == 0) {
					return;
				}

				let url = urls.shift();

				let job = Jobs.discoverUrl(url);
				job.on('exit', function (job) {
					startValidationJob(url, discoverNextUrl);
				});
				JobManager.performJob(job);
			}

			//TODO: add settings to control how many jobs to run in parallel.
			discoverNextUrl();
			discoverNextUrl();
			discoverNextUrl();
		})

		socket.on('start-list', function (url) {
			let job = Jobs.listUrls();
			JobManager.performJob(job);
		})

		socket.on('start-proxy', function(url) {
			Api.startProxy();
		});

		socket.on('stop-proxy', function(url) {
			Api.stopProxy();
		});

		socket.on('start-gwc', function() {
			Api.startGwc();
		});

		socket.on('stop-gwc', function () {
			Api.stopGwc();
		});

		/* BEGIN - ALL LEGACY STUFF - CONSIDER REFACTOR */

		socket.on('start-download-geosource', function (id) {
			JobManager.performJob(Jobs.startGwc('download-geosource', 'pyxis://' + id));
		});

		socket.on('start-import-geosource', function (id) {
			JobManager.performJob(Jobs.startGwc('import-geosource', 'pyxis://' + id));
		});

		socket.on('start-gallery-status', function (id) {
			var job = Jobs.startGwc('gallery-status', id);
			JobManager.performJob(job);

			job.on('exit', function () {
				io.emit('gallery-status', JobManager.geoSources || []);
			})
		});

		/* END - ALL LEGACY STUFF */
	});

	app.get('/node', function(req,res) {
		res.send(JSON.stringify(JobManager.jobs.map(function(job) {
			return {
				id: job.id,
				name: job.name,
				status: job.status,
			};
		})));
		res.end();
	});
}

Api.startGwc = function () {
	config.gwc.keepAlive = true;
	if (JobManager.find({ gwc: true }).length == 0) {
		['master', 'server', 'import'].forEach(function (type) {
			config.gwc[type + 'Ports'].forEach(function (port, index) {
				JobManager.performJob(Jobs.startGwc(type, index));
			});
		});
	}
}

Api.stopGwc = function () {
	config.gwc.keepAlive = false;
	JobManager.find({ gwc: true }).forEach(job => job.kill());
}

Api.startProxy = function() {
	config.proxy.keepAlive = true;
	if (JobManager.find({type:'proxy'}).length == 0) {
		JobManager.performJob(Jobs.startProxy('http://localhost:1337'));
	}
}

Api.stopProxy = function() {
	config.proxy.keepAlive = false;
	JobManager.find({type:'proxy'}).forEach(job=>job.kill());
}

module.exports = Api;