<template>
	<div>
		<h2 class="space">
			Jobs
			<v-btn round color="primary" dark style="float:right;margin-right:10px" @click="clearAllDone()">Clear All Done</v-btn>
		</h2>

		<div class="job-info" v-for="job in state.jobs" v-bind:key="job.id">
			<div class="job-header" v-bind:class="{ running: job.status == 'running'}">
				{{job.name}} - {{job.id}}
				<button class="close" @click.stop="killJob(job)">X</button>
			</div>

			<div class="inside">
				<task class="task" v-for="task in state.jobTasks[job.id]" v-bind:key="task.id" v-bind:task="task" v-on:close="removeTask(task)"></task>
			</div>
		</div>

	</div>
</template>

<script>
import Task from './Task.vue'
import store from '../Store';

export default {
	name: 'cluster',
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
		updateTasks(tasks) {
			this.tasks = tasks
			if (this.tasks.some(task=>task.info && task.info.gwc)) {
				this.gwcRunning = true;
			}
		},
		updateTask(taskUpdate) {
			for(var i=0;i<this.tasks.length;i++) {
				var task = this.tasks[i];
				if (task.id === taskUpdate.id) {
					task.status = taskUpdate.status;
					task.usage = taskUpdate.usage;
					task.info = taskUpdate.info;
					task.log = taskUpdate.log;
					return;
				}
			}
			//if we got here, this is a new task
			this.tasks.unshift(taskUpdate);
		},
		clearAllDone() {
			store.clearAllDone();
		},
		removeTask(taskToRemove) {
			if (taskToRemove.status == 'done') {							
				for(var i=0;i<this.state.tasks.length;i++) {
					var task = this.state.tasks[i];
					if (task.id === taskToRemove.id) {
						this.state.tasks.splice(i,1);
						return;
					}
				}
			} else {
				//send kill command
				this.$socket.emit('kill-task',taskToRemove.id);
			} 
		},
		killJob(jobToRemove) {
			if (jobToRemove.status == 'running') {
				this.$socket.emit('kill-job',jobToRemove.id);
			} else {
				for(var i=0;i<this.state.jobs.length;i++) {
					var job = this.state.jobs[i];
					if (job.id === jobToRemove.id) {
						this.state.jobs.splice(i,1);
						return;
					}
				}
			}
		}
	},
	filters: {
		mb (value) {
			return Math.round( value / 1024 / 1024) + "[MB]";
		}
	},
	components: { Task }
}
</script>


<style>

.space {
	margin-bottom: 20px;
}

.job-info {
	border: 1px solid #888;
	margin: 10px;
	position: relative;
}

.job-info .job-header {
	display: inline-block;
	position: relative;
	overflow: hidden;
	padding: 10px;
	width: 100%;
	border-bottom: 1px solid #888;
}

.job-info .job-header.running {
	background-color: #32a323;
}

.job-info .job-header button.close {
	position: absolute;
    right: 10px;
    top: 10px;
	transition: all 0.2s ease-in-out;
	border: 1px solid transparent;
	padding: 0px 10px;
} 

.job-info .job-header:hover button.close {
	border: 1px solid #888;
}
</style>