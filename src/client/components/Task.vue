<template>
	<div class="task">
		<div class="header" v-bind:class="{ running: task.status == 'running' , 'high-cpu': task.usage.cpu > 50 }" @click="expanded = !expanded">
			<span class="section type">N #{{taskNode}}</span>
			<span class="section id">{{task.job || task.id}}</span>
			<span class="section type">{{task.info.type || 'task' }}</span>
			<span class="section type">{{task.status}}</span>
			<span class="section stat">
				<span v-if="task.status == 'running'">
					<span v-if="idleMinutes > 1">Idle for {{task.usage.idleFrom | fromNow }}</span>
					<span v-else>CPU {{task.usage.cpu | percent}}</span>
				</span>
				<span v-else>CPU -</span>
			</span>
			<span class="section stat">MEM {{task.usage.memory | mb}}</span>
			<span class="section name">{{task.name}}</span>
			<button class="close" @click.stop="closeButtonClick">X</button>
		</div>
		<div class="progress" v-if="task.info.progress > 0 && task.info.progress < 100">
			<div class="bar" v-bind:style="{width: task.info.progress + '%'}"></div>
		</div>
		<div class="details" v-if="expanded">
			<div v-for="(value,key) in task.info" v-bind:key="key">{{key}} = {{value}}</div>
		</div>
		<div class="details log" v-if="expanded">
			<div v-for="(line,index) in task.log" :key="index">{{line}}</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'task',
	props: ['task'],
	data () {
		return {
			expanded: false
		}
	},
	methods: {
		closeButtonClick() {
			this.$emit('close',this.task);
		}
	},
	mounted() {
	},
	computed: {
		idleMinutes () {
			if (this.task.usage.idleFrom) {
				return (Date.now() - new Date(this.task.usage.idleFrom))/1000/60;
			}
		},
		taskNode () {
			if (this.task.details && this.task.details.node) {
				return this.task.details.node.substr(0,6);
			}
			return '';
		}
	},
	filters: {
		percent (value) {
			return Math.ceil(value) + '%';
		},
		mb (value) {
			return Math.round( value / 1024 / 1024) + "[MB]";
		},
		fromNow (value) {
			if (!value) {
				return "";
			}
			var date = new Date(value);
			var delta = date.getTime() - Date.now();

			var prefix = "";
			if (delta < 0) {
				delta = -delta;
			} else {
				prefix = "in ";
			}

			delta /= 1000;

			if (delta < 60) {
				return prefix + Math.floor(delta) + " sec";
			}
			delta /= 60;
			if (delta < 60) {
				return prefix + Math.floor(delta) + " min";
			}
			var min = delta % 60;
			var hour = delta / 60;
			if (hour < 24) {
				return prefix +  Math.floor(hour) + " hour " + Math.floor(min) + " min";
			}
			var days = hour / 24;
			var hour = hour % 24;
			return prefix +  Math.floor(days) + " days " + Math.floor(hour) + " hours";
		}
	}
}
</script>

<style>
.task {
	text-align: left;
	border: 1px solid #888;
	box-shadow: 0 5px 10px 0px rgba(0,0,0,0.2);
	margin: 10px;
	position: relative;
}

.task .header .section {
	display: inline-block;
	padding: 10px;
}

.task .header .id {
	width: 300px;
	border-right: 1px solid #aaa;
}

.task .header .type {
	width: 100px;
	border-right: 1px solid #aaa;
}

.task .header .stat {
	width: 150px;
	border-right: 1px solid #aaa;
}

.task .header button.close {
	position: absolute;
	right: 10px;
	top: 10px;
	border: 1px solid transparent;
	transition: all 0.2s ease-in-out;
	padding: 0px 10px;
}

.task .header:hover button.close {
	border: 1px solid #888;
}

.task .progress {
	border-top: 1px solid #aaa;
	height: 5px;
	position: relative;
	background-color: white;
}

.task .progress .bar {
	background-color: #888;
	position: absolute;
	left: 0;
	height: 100%;
	transition: width 0.5s ease-in-out;
}

.task .details {
	border-top: 1px solid #aaa;
	padding: 10px;
}

.task .details.log {
	font-size: 14px;
	font-family: Courier New, Courier, monospace;
	background-color: #444;
	color: white;
}

.task .header.running {
	background-color: #32a323;
}

.task .header.running.high-cpu {
	background-color:#a59a21;
}
</style>