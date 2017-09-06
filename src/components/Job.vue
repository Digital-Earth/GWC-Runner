<template>
	<div class="job">
		<div class="header" v-bind:class="{ running: job.status == 'running' , 'high-cpu': job.usage.cpu > 50 }" @click="expanded = !expanded">
			<span class="section id">#{{job.id}}</span>
			<span class="section type">{{job.info.type}}</span>
			<span class="section type">{{job.status}}</span>
			<span class="section stat">
				<span v-if="job.status == 'running'">
					<span v-if="idleMinutes > 1">Idle for {{job.info.idleFrom | fromNow }}</span>
					<span v-else>CPU {{job.usage.cpu | percent}}</span>
				</span>
				<span v-else>CPU -</span>
			</span>
			<span class="section stat">MEM {{job.usage.memory | mb}}</span>
			<span class="section name">{{job.name}}</span>
			<button class="close" @click.stop="closeButtonClick">X</button>
		</div>
		<div class="progress" v-if="job.info.progress > 0 && job.info.progress < 100">
			<div class="bar" v-bind:style="{width: job.info.progress + '%'}"></div>
		</div>
		<div class="details" v-if="expanded">
			<div v-for="(value,key) in job.info" v-bind:key="key">{{key}} = {{value}}</div>
		</div>
		<div class="details log" v-if="expanded">
			<div v-for="line in job.log">{{line}}</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'job',
	props: ['job'],
	data () {
		return {
			expanded: false
		}
	},
	methods: {
		closeButtonClick() {
			this.$emit('close',this.job);
		}
	},
	mounted() {
	},
	computed: {
		idleMinutes () {
			if (this.job.info.idleFrom) {
				return (Date.now() - new Date(this.job.info.idleFrom))/1000/60;
			}
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
.job {
	text-align: left;
	border: 1px solid #888;
	box-shadow: 0 5px 10px 0px rgba(0,0,0,0.2);
	margin: 10px;
	position: relative;
}

.job .header .section {
	display: inline-block;
	padding: 10px;
}

.job .header .id,.job .header .type {
	width: 100px;
	border-right: 1px solid #aaa;
}

.job .header .stat {
	width: 150px;
	border-right: 1px solid #aaa;
}

.job .header button.close {
	position: absolute;
	right: 10px;
	top: 10px;
}

.job .progress {
	border-top: 1px solid #aaa;
	height: 5px;
	position: relative;
	background-color: white;
}

.job .progress .bar {
	background-color: #888;
	position: absolute;
	left: 0;
	height: 100%;
	transition: width 0.5s ease-in-out;
}

.job .details {
	border-top: 1px solid #aaa;
	padding: 10px;
}

.job .details.log {
	font-size: 14px;
	font-family: Courier New, Courier, monospace;
	background-color: #444;
	color: white;
}

.job .header.running {
	background-color: #afa;
}

.job .header.running.high-cpu {
	background-color: #4a4;
}
</style>