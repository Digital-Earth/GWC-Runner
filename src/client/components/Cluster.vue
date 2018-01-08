<template>
	<div>
		<h2 class="space">Jobs</h2>

		<div class="task" v-for="job in state.jobs" v-bind:key="job.id">
			<div class="header" v-bind:class="{ running: job.status == 'running'}">
				{{job.name}} - {{job.id}}
			</div>
		</div>

		<h2 class="space">Tasks
			<v-btn round color="primary" dark style="float:right;margin-right:10px" @click="clearAllDone()">Clear All Done</v-btn>
		</h2>

		<task class="task" v-for="task in state.tasks" v-bind:key="task.id" v-bind:task="task" v-on:close="removeTask(task)"></task>
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
			this.state.tasks = this.state.tasks.filter(task=>task.status != 'done');
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