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
			makeTagsSearchable();
			updateUrlsActive();
            store.emit('urls',urls);
		});
		socket.on('gallery-status', function(geosources) {
			store.state.geoSources = geosources;
		});
		
		socket.on('jobs', function(jobs) {
			store.state.jobs = jobs;
			updateRunningServices();
		});

		socket.on('job-update', function(jobUpdate) {
			let jobFound = false;
			for(let i=0;i<store.state.jobs.length;i++) {
				let job = store.state.jobs[i];
				if (job.id === jobUpdate.id) {
					job.status = jobUpdate.status;
					job.data = jobUpdate.data;
					jobFound = true;
					break;
				}
			}
			if (!jobFound) {
				//if we got here, this is a new job
				store.state.jobs.unshift(jobUpdate);
			}
			updateRunningServices();
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
			store.state.jobTasks = {};
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
				store.state.jobTasks[job.id] = [];
			});

			store.state.tasks.forEach((task) => {
				if (task.details.job in jobNames) {
					store.state.jobTasks[task.details.job].push(task);
				}
			});
		}

		function makeTagsSearchable() {
			for(let url of store.state.urls) {
				url.searchText = url.url + " " + url.tags.join(' ');
			}
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