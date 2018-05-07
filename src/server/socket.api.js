let serverContext = require('./ServerContext');
var Job = require('./Job');
var config = require('./config');
var debounce = require('debounce');

const { ClusterTaskManager, LocalTaskManager } = require('./TaskManager');

var Api = {}

Api.attachNodesNamespace = function(io, options) {
	options = options || {};
	serverContext.api = Api;
	serverContext.config = config;
	serverContext.cluster = new ClusterTaskManager(io);
	if (options.local) {
		serverContext.cluster.addNode('local', new LocalTaskManager());
	}


	serverContext.cluster.on('new-task', (task) => console.log('new-task',task));
	serverContext.cluster.on('kill-task', (task) => console.log('kill-task',task))
	serverContext.cluster.on('task-end', (task) => console.log('task-end',task))

	serverContext.cluster.on('node-connected', (node) => console.log('node-connected',node))
	serverContext.cluster.on('node-disconnected', (node) => console.log('node-disconnected',node))
}

Api.attachRestAPI = function(app) {
	//rest API
	app.get('/nodes', function (req, res) {
		res.send(JSON.stringify(serverContext.cluster.nodes()));
		res.end();
	});

	app.get('/tasks', function (req, res) {
		res.send(JSON.stringify(serverContext.cluster.tasks()));
		res.end();
	});

	app.get('/endpoints', function(req, res) {
		let endpoints = serverContext.cluster.tasks().filter(task=>Object.keys(task.endpoints).length>0).map(task=>{ return { endpoints:task.endpoints, details:task.details, state: task.state}});
		res.send(JSON.stringify(endpoints));
		res.end();
	});

	/*

	TODO: change job tracking API to allow get endpoints by app/job/task-name/
	
	app.get('/jobs/:id', function (req, res) {
		let job = serverContext.jobs.filter(job => job.id == req.params.id || job.name == req.params.id)[0];
		if (job) {
			res.send(JSON.stringify(transformJob(job)));
			res.end();
		} else {
			res.status(404);
			res.send('Job ' + req.params.id + ' not found');
			res.end();
		}
	});

	app.get('/jobs', function (req, res) {
		res.send(JSON.stringify(serverContext.jobs.map(transformJob)));
		res.end();
	});
	*/
}

Api.attach = function (server, app) {
	console.log('setup socket.io API');

	var io = require('socket.io')(server);


	Api.attachNodesNamespace(io.of('/node'));
	serverContext.cluster.expose(io.of('/app'));

	Api.attachRestAPI(app);

	/*

	TODO: change job tracking API to allow get endpoints by app/job/task-name/

	serverContext.jobs = [];

	Api.trackJob = function (job) {
		job.on('start', function () {
			serverContext.jobs.push(job);
			serverContext.emit('job',job);
		});

		job.state.on('mutate', function () {
			serverContext.emit('job',job);
		});

		job.on('done', function () {
			serverContext.jobs.splice(serverContext.jobs.indexOf(job), 1);
			serverContext.emit('job',job);
		});

		job.on('cancelled', function () {
			serverContext.jobs.splice(serverContext.jobs.indexOf(job), 1);
			serverContext.emit('job',job);
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

		socket.on('new-task', function(taskDetails) {
			serverContext.cluster.start(taskDetails);
		});

		socket.emit('tasks', serverContext.cluster.tasks());
		socket.emit('nodes', serverContext.cluster.nodes());
	});
	*/
	//job track api

	let jobSocket = io.of('/job');

	let jobTrackClients = [];

	jobSocket.on('connection', function(socket) {
		let trackList = [];

		let emit = debounce(function(job) {
			client.socket.emit('job-update',transformJob(job));
		},100);

		let client = {
			socket,
			emit,
			isTracking(job) {
				return trackList.indexOf(job.id) !== -1 || trackList.indexOf(job.name) !== -1;
			}
		};

		socket.on('start-tracking',function(id) {
			let index = trackList.indexOf(id);
			if (index == -1) {
				trackList.push(id);

				//send current state if we are tracking this job
				for(let job of serverContext.jobs) {
					if (job.id == id || job.name == id) {
						client.emit(job);
					}
				}
			};
		});
		socket.on('stop-tracking', function(id) {
			let index = trackList.indexOf(id);
			if (index != -1) {
				trackList.splice(index,1);
			}
		});

		socket.on('disconnect', function() {
			jobTrackClients.splice(jobTrackClients.indexOf(client),1);
		});

		jobTrackClients.push(client);
	});

	serverContext.on('job', function(job) {
		for(let client of jobTrackClients) {
			if (client.isTracking(job)) {
				client.emit(job);
			}
		}
	});

	
}


module.exports = Api;