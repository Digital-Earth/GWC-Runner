<template>
	<div>
		<h2 class="space">Jobs
			<v-btn round color="primary" dark style="float:right;margin-right:10px" @click="clearAllDone()">Clear All Done</v-btn>
		</h2>

		<job class="job" v-for="job in state.jobs" v-bind:key="job.id" v-bind:job="job" v-on:close="removeJob(job)"></job>
	</div>
</template>

<script>
import Job from './Job.vue'
import store from '../Store';

export default {
	name: 'jobs',
	data () {
		return {
			state: store.state,
			newUrl: "",
			geoSourceId: "",
			autoDiscovery: {
				active: false,
				urls: [],
			}
		}
	},
	methods: {
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
			this.state.jobs = this.state.jobs.filter(job=>job.status != 'done');
		},
		removeJob(jobToRemove) {
			if (jobToRemove.status == 'done') {							
				for(var i=0;i<this.state.jobs.length;i++) {
					var job = this.state.jobs[i];
					if (job.id === jobToRemove.id) {
						this.state.jobs.splice(i,1);
						return;
					}
				}
			} else {
				//send kill command
				this.$socket.emit('kill-job',jobToRemove.id);
			}
		}
	},
	filters: {
		mb (value) {
			return Math.round( value / 1024 / 1024) + "[MB]";
		}
	},
	components: { Job }
}
</script>


<style>

.space {
	margin-bottom: 20px;
}

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

.url-info .background-container {
	position: absolute;
	width: 100%;
	height: 100%;
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