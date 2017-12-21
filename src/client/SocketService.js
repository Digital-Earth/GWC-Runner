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
		socket.on('urls', function(urls) {
			store.state.urls = urls;
			updateUrlsActive();
            store.emit('urls',urls);
		});
		socket.on('gallery-status', function(geosources) {
			store.state.geoSources = geosources;
		});
		socket.on('jobs', function(jobs) {
			store.state.jobs = jobs;
			updateUrlsActive();
			updateRunningServices();
			store.emit('jobs',store.state.jobs);
		});
		socket.on('job-update', function(jobUpdate) {
			let jobFound = false;
			for(let i=0;i<store.state.jobs.length;i++) {
				let job = store.state.jobs[i];
				if (job.id === jobUpdate.id) {
					job.status = jobUpdate.status;
					job.usage = jobUpdate.usage;
					job.info = jobUpdate.info;
					job.log = jobUpdate.log;
					jobFound = true;
					break;
				}
			}
			if (!jobFound) {
				//if we got here, this is a new job
				store.state.jobs.unshift(jobUpdate);
			}
			updateUrlsActive();
			updateRunningServices();
			store.emit('jobs',store.state.jobs);
		});

		function updateRunningServices() {
			store.state.services.gwc = false;
			store.state.services.proxy = false;
			store.state.jobs.forEach((job) => {
				if (job.status === "running") {
					
					if (job.info.gwc) {
						store.state.services.gwc = true;
					}

					if (job.info.type === 'proxy') {
						store.state.services.proxy = true;
					}
				}
			});
		}
		function updateUrlsActive () {
			let activeUrls = {};
			store.state.jobs.forEach((job) => {
				if (job.status === "running" && job.info.url) {
					activeUrls[job.info.url] = true;
				}
			});

			//update urls..
			store.state.urls.forEach((url) => {
				url.active = url.url in activeUrls;
			});
		}
    }
}