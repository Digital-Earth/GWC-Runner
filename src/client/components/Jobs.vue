<template>
	<div>
		<h1>Jobs Runner {{connected?'connected':'disconnected'}}</h1>
		<toggle-button @change="toggleGWC" :sync="true" :value="gwcRunning"></toggle-button> GWC<br>
		<toggle-button @change="toggleProxy" :sync="true" :value="proxyRunning"></toggle-button> Proxy<br>
		<h2>Jobs <button style="float:right;margin-right:10px" @click="clearAllDone()">Clear All Done</button></h2>
		<job class="job" v-for="job in jobs" v-bind:key="job.id" v-bind:job="job" v-on:close="removeJob(job)"></job>

		<h2>DataSets</h2>
		<button @click="startListJob()">Refresh</button>
		<div v-if="datasets.total > 0">
			<h2>From {{datasets.total}} Dataset, {{datasets.working}} are working</h2>
			
			<div class="url-info" v-for="url in urls" v-bind:key="url.url">
				<div class="background green" v-bind:style="{ width: url.working +'%'}"></div>
				<div class="background red" v-bind:style="{ width: 100 * url.broken / url.datasets  +'%'}"></div>
				<div class="details">
					<div class="section small">{{url.status}}</div>
					<div class="section small">{{url.working}}% of {{url.datasets}}</div>
					<div class="section">{{url.url}}</div>
					<div class="actions">
						<button @click="startDiscoverJob(url.url)">Discover</button>
						<button @click="startValidateJob(url.url)">Validate</button>
					</div>
				</div>
			</div>

			<div>
				<input v-model="newUrl" @key-up:enter="addNewUrl()"><button @click="addNewUrl">Add</button>
			</div>
		</div>
		

		<h2>GeoSources</h2>
		<button @click="startGalleryStatusStatusJob()">Refresh</button>
		<div>
			<input v-model="geoSourceId" @key-up:enter="checkGeoSource()"><button @click="checkGeoSource">Check</button>
		</div>
		<div class="url-info" v-for="geoSource in geoSources" v-bind:key="geoSource.id"  v-bind:class="{error: !geoSource.working}">
			<div class="details">
				<div class="section">{{geoSource.id}}</div>
				<div class="section">{{geoSource.name}}</div>
				<div class="section">{{geoSource.dataSize | mb}} | {{geoSource.type}} | {{geoSource.working?'':'Broken'}} {{geoSource.hasStyle?'':'No Style'}}</div>
				<div class="section">
					<button @click="startDownloadJob(geoSource.id)">Download</button>
					<button @click="startImportJob(geoSource.id)">Import</button>
					<button>Fix Style</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import Job from './Job.vue'
import ToggleButton from './ToggleButton.vue'

export default {
	name: 'jobs',
	data () {
		return {
			connected: false,
			gwcRunning: false,
			proxyRunning: false,
			jobs: [],
			urls: [],
			geoSources: [],
			newUrl: "",
			geoSourceId: ""
		}
	},
	methods: {
		connect () {
			this.connected = true
		},
		disconnect () {
			this.connected = false
		},


		updateJobs(jobs) {
			this.jobs = jobs
			if (this.jobs.some(job=>job.info && job.info.gwc)) {
				this.gwcRunning = true;
			}
		},
		updateJob(jobUpdate) {
			for(var i=0;i<this.jobs.length;i++) {
				var job = this.jobs[i];
				if (job.id === jobUpdate.id) {
					job.status = jobUpdate.status;
					job.usage = jobUpdate.usage;
					job.info = jobUpdate.info;
					job.log = jobUpdate.log;
					return;
				}
			}
			//if we got here, this is a new job
			this.jobs.unshift(jobUpdate);
		},
		clearAllDone() {
			this.jobs = this.jobs.filter(job=>job.status != 'done');
		},
		removeJob(jobToRemove) {
			if (jobToRemove.status == 'done') {							
				for(var i=0;i<this.jobs.length;i++) {
					var job = this.jobs[i];
					if (job.id === jobToRemove.id) {
						this.jobs.splice(i,1);
						return;
					}
				}
			} else {
				//send kill command
				this.$socket.emit('kill-job',jobToRemove.id);
			}
		},


		startListJob() {
			this.$socket.emit('start-list');
		},
		updateUrls(urls) {
			this.urls = urls;
		},
		startDiscoverJob(url) {
			this.$socket.emit('start-discover',url);
		},
		startValidateJob(url) {
			this.$socket.emit('start-validate',url);
		},
		addNewUrl() {
			if (this.newUrl.startsWith('http://') || this.newUrl.startsWith('https://')) {
				this.$socket.emit('start-add-url',this.newUrl);
				this.newUrl = "";
			}
		},


		startGalleryStatusStatusJob() {
			this.$socket.emit('start-gallery-status');
		},
		updateGalleryStatus(geoSources) {
			this.geoSources = geoSources;
		},
		checkGeoSource() {
			this.$socket.emit('start-gallery-status',this.geoSourceId);
		},

		startDownloadJob(id) {
			this.$socket.emit('start-download-geosource',id);
		},
		startImportJob(id) {
			this.$socket.emit('start-import-geosource',id);
		},

		toggleGWC(event) {
			if (event.value) {
				this.$socket.emit('start-gwc');
			} else {
				this.$socket.emit('stop-gwc');
			}
		},

		toggleProxy(event) {
			if (event.value) {
				this.$socket.emit('start-proxy');
			} else {
				this.$socket.emit('stop-proxy');
			}
		}
	},
	computed: {
		datasets: function() {
			var total = 0;
			var working = 0;
			this.urls.forEach( (url) => {
				total += +url.datasets;
				working += (+url.working * (+url.datasets))/100;
			});
			working = Math.round(working);
			return {
				total,
				working
			}
		}
	},
	mounted() {
		var self = this;
		var socket = window.io();
		socket.on('connect', function() {
			self.connect();
		});
		socket.on('disconnect', function() {
			self.disconnect();
		})
		socket.on('urls', function(urls) {
			self.updateUrls(urls)
		});
		socket.on('gallery-status', function(geosources) {
			self.updateGalleryStatus(geosources)
		});
		socket.on('jobs', function(jobs) {
			self.updateJobs(jobs)
		});
		socket.on('job-update', function(job) {
			self.updateJob(job)
		});
		self.$socket = socket;
		console.log('mounted');
	},
	destroyed() {
		console.log('closed');
		this.$socket.close();
	},
	filters: {
		mb (value) {
			return Math.round( value / 1024 / 1024) + "[MB]";
		}
	},
	components: { Job, ToggleButton }
}
</script>


<style>

.url-info {
	border: 1px solid #888;
	margin: 10px;
	position: relative;
}

.url-info .section {
	display: inline-block;
	position: relative;
	overflow: hidden;
	padding: 10px;
}

.url-info .section.small {
	width: 200px;
	border-right: 1px solid #aaa;
}

.url-info .actions {
	position: absolute;
	right: 10px;
	top: 10px;
}

.url-info .background {
	position: absolute;
	top: 0;
	height: 100%;
}

.url-info .background.green {
	left: 0;
	background-color: #afa;
}

.url-info .background.red {
	right: 0;
	background-color: #faa;
}

.url-info .details {
	position: relative;
	left: 0;
	top: 0;
	width: 100%;
	text-align: left;
}
.url-info.error {
	background-color: #faa;
}

</style>