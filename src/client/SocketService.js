import store from './Store';

export default {
    install: function(Vue, options) {
        var socket = window.io();
        Vue.prototype.$socket = socket;

        socket.on('connect', function() {
			store.state.connected = true;
		});
		socket.on('disconnect', function() {
			store.state.connected = false;
		})
		socket.on('roots', function(urls) {
			store.state.urls = urls;
			updateUrlsActive();
            store.emit('urls',urls);
		});
		socket.on('gallery-status', function(geosources) {
			store.state.geoSources = geosources;
		});
		socket.on('jobs', function(jobs) {
			store.state.jobs = jobs;
		});
		socket.on('tasks', function(tasks) {
			store.state.tasks = tasks;
			updateUrlsActive();
			updateRunningServices();
			store.emit('tasks',store.state.tasks);
		});
		socket.on('task-update', function(taskUpdate) {
			let taskFound = false;
			for(let i=0;i<store.state.tasks.length;i++) {
				let task = store.state.tasks[i];
				if (task.id === taskUpdate.id) {
					task.status = taskUpdate.status;
					task.usage = taskUpdate.usage;
					task.info = taskUpdate.info;
					task.log = taskUpdate.log;
					taskFound = true;
					break;
				}
			}
			if (!taskFound) {
				//if we got here, this is a new task
				store.state.tasks.unshift(taskUpdate);
			}
			updateUrlsActive();
			updateRunningServices();
			store.emit('tasks',store.state.tasks);
		});

		function updateRunningServices() {
			store.state.services.gwc = false;
			store.state.services.proxy = false;
			let jobNames = {};
			store.state.jobs.forEach((job) => {
				jobNames[job.id] = job.name;
				if (job.status === "running") {
					
					if (job.name == 'gwc') {
						store.state.services.gwc = true;
					}

					if (job.name == 'proxy') {
						store.state.services.proxy = true;
					}
				}
			});

			store.state.tasks.forEach((task) => {
				if (task.details.job) {
					task.job = jobNames[task.details.job];
				}
			});
		}
		function updateUrlsActive () {
			let activeUrls = {};
			store.state.tasks.forEach((task) => {
				if (task.status === "running" && task.info.url) {
					activeUrls[task.info.url] = true;
				}
			});

			//update urls..
			store.state.urls.forEach((url) => {
				url.active = url.url in activeUrls;
			});
		}

		socket.on('cluster', function(nodes) {
			store.state.nodes = nodes;
		});
    }
}