let serverContext = require('./ServerContext');
var Job = require('./Job');
var config = require('./config');

const { ClusterTaskManager, LocalTaskManager } = require('./TaskManager');

const createGwcDetails = require('./jobs/gwc');

var Api = {}

Api.attach = function (server, app) {
	console.log('setup socket.io API');

	var io = require('socket.io')(server);

	let nodesSocket = io.of('/node');

	serverContext.api = Api;
	serverContext.config = config;
	serverContext.cluster = new ClusterTaskManager(nodesSocket);
	serverContext.cluster.addNode('local', new LocalTaskManager());

	function transformTask(task) {
		return {
			id: task.id,
			node: task.node,
			name: task.name,
			status: task.status,
			details: task.details,
			usage: task.usage || { cpu: 0, memory: 0 },
			info: task.state || {},
			log: task.log || []
		}
	}

	function sendInitialUpdate() {
		io.emit('tasks', serverContext.cluster.tasks().map(transformTask));
		io.emit('roots', serverContext.roots || []);
		io.emit('gallery-status', serverContext.geoSources || []);
		sendCluster();
		sendJobs();
	}

	serverContext.on('roots', function (roots) {
		io.emit('roots', roots || []);
	});

	serverContext.on('geoSources', function (geoSources) {
		io.emit('gallery-status', serverContext.geoSources || []);
	});

	function sendTaskUpdate(task) {
		io.emit('task-update', transformTask(task));
	}

	function sendCluster() {
		io.emit('cluster', serverContext.cluster.nodes() || []);
	}

	function sendJobs() {
		io.emit('jobs', serverContext.jobs.map((job) => {
			return {
				id: job.id,
				name: job.name,
				status: job.state.status,
				state: job.state.state,
				data: job.state.data,
				details: job.state.details
			}
		}));
	}

	serverContext.jobs = [];

	Api.trackJob = function (job) {
		job.on('start', function () {
			serverContext.jobs.push(job);
			sendJobs();
		});

		job.on('done', function () {
			serverContext.jobs.splice(serverContext.jobs.indexOf(job), 1);
			sendJobs();
		});

		job.on('cancelled', function () {
			serverContext.jobs.splice(serverContext.jobs.indexOf(job), 1);
			sendJobs();
		});
	}

	serverContext.cluster.on('new-task', sendTaskUpdate);
	serverContext.cluster.on('task-end', sendTaskUpdate);
	serverContext.cluster.on('mutate', sendTaskUpdate);

	serverContext.cluster.on('new-node', sendCluster);
	serverContext.cluster.on('node-detach', sendCluster);

	io.on('connection', (socket) => {
		console.log('connected')

		sendInitialUpdate();

		socket.on('kill-task', function (taskId) {
			serverContext.cluster.killTaskById(taskId);
		});

		socket.on('start-add-url', function (url) {
			let job = Api.jobs.addUrl({ url: url });
			Api.trackJob(job);
			job.start();
		})


		socket.on('start-validate', function (url) {
			let job = Api.jobs.validate({ url: url });
			Api.trackJob(job);
			job.start();
		})

		socket.on('start-discover', function (url) {
			let job = Api.jobs.discover({ url: url });
			Api.trackJob(job);
			job.start();
		})

		socket.on('start-discover-and-validate', function (urls, parallel) {
			let job = Api.jobs.autoDiscover({ urls: urls, parallel: parallel || 3 });
			Api.trackJob(job);
			job.start();
		})

		socket.on('update-tags', function (url, addTags, removeTags ) {
			let job = Api.jobs.updateTags({ url, addTags, removeTags });
			Api.trackJob(job);
			job.start();
		})

		socket.on('start-list', function (url) {
			let job = Api.jobs.list({});
			Api.trackJob(job);
			job.start();
		})

		socket.on('start-proxy', function (url) {
			Api.startProxy();
		});

		socket.on('stop-proxy', function (url) {
			Api.stopProxy();
		});

		socket.on('start-gwc', function () {
			Api.startGwc();
		});

		socket.on('stop-gwc', function () {
			Api.stopGwc();
		});

		/* BEGIN - ALL LEGACY STUFF - CONSIDER REFACTOR */

		socket.on('start-download-geosource', function (id) {
			let job = Api.jobs.gwcDownloadGeoSource({ id: id });
			Api.trackJob(job);
			job.start();
		});

		socket.on('start-import-geosource', function (id) {
			let job = Api.jobs.gwcImportGeoSource({ id: id });
			Api.trackJob(job);
			job.start();
		});

		socket.on('start-gallery-status', function (id) {
			let job = Api.jobs.gwcGalleryStatus({ id: id });
			Api.trackJob(job);
			job.start();
		});

		/* END - ALL LEGACY STUFF */
	});

	//rest API ?
	app.get('/nodes', function (req, res) {
		res.send(JSON.stringify(serverContext.cluster.nodes()));
		res.end();
	});

	app.get('/jobs', function (req, res) {
		res.send(JSON.stringify(serverContext.jobs.map((job) => {
			return {
				id: job.id,
				name: job.name,
				status: job.status,
			}
		})));
		res.end();
	});
}

Api.startGwc = function () {
	Api.gwcJob = Api.jobs.gwc();
	Api.trackJob(Api.gwcJob);
	Api.gwcJob.start();
}

Api.stopGwc = function () {
	Api.gwcJob.kill();
}

Api.startProxy = function () {
	Api.proxyJob = Api.jobs.proxy({ url: 'http://localhost:1337' });
	Api.trackJob(Api.proxyJob);
	Api.proxyJob.start();
}

Api.stopProxy = function () {
	Api.proxyJob.kill();
}

Api.jobs = {
	list: function (details) {
		let job = new Job('list urls');

		job.invoke({
			cwd: config.cli.cwd,
			exec: config.cli.exec,
			args: ['url', 'list', '-json'],
			name: 'list urls',
			state: {
				type: 'list',
			}
		}).then(function (taskState) {
			let roots = taskState.data.roots.map((root) => {
				return {
					url: root.Uri,
					status: root.Status,
					datasets: root.DataSetCount,
					working: Math.round(100 * root.VerifiedDataSetCount / root.DataSetCount),
					broken: root.BrokenDataSetCount,
					verified: root.VerifiedDataSetCount,
					unknown: root.UnknownDataSetCount,
					tags: root.Metadata && root.Metadata.Tags ? root.Metadata.Tags : [],
					lastDiscovered: new Date(root.LastDiscovered),
					lastVerified: new Date(root.LastVerified)
				}
			});
			serverContext.emit('roots', roots);
			return roots;
		}).complete();

		return job;
	},
	addUrl: function (details) {

		let job = new Job('add url');
		job.invoke({
			cwd: config.cli.cwd,
			exec: config.cli.exec,
			args: ['url', 'add', details.url],
			name: 'add ' + details.url,
			state: {
				type: 'add',
				url: details.url
			}
		}).complete();

		return job;
	},
	updateTags: function(details) {
		let job = new Job('update')
		let args = ['url','update'];

		if (details.addTags) {
			for(let tag of details.addTags) {
				args.push('-add-tag='+tag);
			}
		}
		if (details.removeTags) {
			for(let tag of details.removeTags) {
				args.push('-remove-tag='+tag);
			}
		}
		args.push(details.url);

		job.invoke({
			cwd: config.cli.cwd,
			exec: config.cli.exec,
			args: args,
			state: {
				type: 'update',
				url: details.url,
			}
		})
		.then(function(taskState) {
			if (taskState.state.root) {
				serverContext.emit('root', taskState.state.root);
			}
		})
		.complete();

		return job;
	},
	discover: function (details) {
		let job = new Job('discover');

		job.invoke({
			cwd: config.cli.cwd,
			exec: config.cli.exec,
			args: ['url', 'discover', details.url],
			name: 'discover ' + details.url,
			state: {
				type: 'discover',
				url: details.url
			}
		})
		.then(function(taskState) {
			if (taskState.state.root) {
				serverContext.emit('root', taskState.state.root);
			}
		})
		.complete();

		return job;
	},
	validate: function (details) {

		let job = new Job('validate')

		job.keepAlive({
			cwd: config.cli.cwd,
			exec: config.cli.exec,
			args: ['url', 'validate', '-n=50', '-clean', details.url],
			name: 'validate ' + details.url,
			state: {
				type: 'validate',
				url: details.url
			}
		}, {
				while: function (taskState) {
					if (taskState.state.root) {
						serverContext.emit('root', taskState.state.root);
						return taskState.state.datasets > 0;
					}
					return false;
				}
			}).then(function (taskState) {
				if (!taskState.state.root) {
					return job.invoke({
						cwd: config.cli.cwd,
						exec: config.cli.exec,
						args: ['url', 'update', '-status=Broken', details.url],
						state: {
							type: 'update',
							url: details.url,
							status: 'Broken'
						}
					});
				} else if (taskState.state.root.status == 'Broken') {
					return job.invoke({
						cwd: config.cli.cwd,
						exec: config.cli.exec,
						args: ['url', 'update', '-status=Discovered', details.url],
						state: {
							type: 'update',
							url: details.url,
							status: 'Discovered'
						}
					});
				}
			}).complete();

		return job;
	},
	discoverAndValidate: function (details) {
		let job = new Job('discover and validate');

		job.invoke(Api.jobs.discover(details))
			.invoke(Api.jobs.validate(details))
			.complete();

		return job;
	},
	autoDiscover: function (details) {
		let job = new Job('auto discover');

		job.forEach(details.urls, function (url) {
			return Api.jobs.discoverAndValidate({ url: url })
		}, { parallel: details.parallel || 3 }).complete();

		return job;
	},
	proxy: function (details) {
		let job = new Job('proxy');

		job.keepAlive({
			cwd: config.proxy.cwd,
			exec: config.proxy.exec,
			args: [config.proxy.start, details.url],
			name: 'proxy ' + details.url,
			state: {
				type: 'proxy',
				url: details.url
			}
		});

		return job;
	},
	gwc: function (details) {
		let job = new Job('gwc');

		['master', 'server', 'import'].forEach(function (type) {
			config.gwc[type + 'Ports'].forEach(function (port, index) {
				job.keepAlive(createGwcDetails(type, index));
			})
		});

		return job;
	},
	gwcDownloadGeoSource: function (details) {
		let job = new Job('download GeoSource');

		job.invoke(createGwcDetails('download-geosource', 'pyxis://' + details.id)).complete();

		return job;
	},
	gwcImportGeoSource: function (details) {
		let job = new Job('import GeoSource');

		job.invoke(createGwcDetails('import-geosource', 'pyxis://' + details.id)).complete();

		return job;
	},
	gwcGalleryStatus: function (details) {
		let job = new Job('gallery status');

		job.invoke(createGwcDetails('gallery-status', details.id)).then((taskState) => {
			serverContext.emit('geoSources', taskState.data.geoSources || []);
		}).complete();

		return job;
	}
}

module.exports = Api;