const EventEmitter = require('events');

var ee = new EventEmitter();

var JobManager = {
	completedJobs: [],	
	jobs: [],
	track(job) {
		JobManager.jobs.unshift(job)
		
		ee.emit('job-started', job);

		job.once('exit',function() {
			ee.emit('job-completed', job);
			var index = JobManager.jobs.indexOf(job);
			JobManager.jobs.splice(index,1);

			JobManager.completedJobs.unshift(job);
			if (JobManager.completedJobs.length > 100) {
				JobManager.completedJobs.pop();
			}
		})
    },
    updateRoots(roots) {
        this.roots = roots;
        ee.emit('roots-updated', roots);
    },
	performJob(job) {
		job.start();
		job.on('error', function(job,error) {
			console.log(error);
		});
		job.on('usage',function(job,usage) {
			console.log(usage);
		});
		job.on('line',function(job,line) {
			console.log(line);
		});
		job.on('exit',function(job) {
			console.log('done');
		});
	},
	on(event,callback) {
		ee.on(event,callback)
	},
	once(event,callback) {
		ee.once(event,callback)
	},
	find(search) {
		var result = [];
		var searchKeys = Object.keys(search);
		for(var i=0;i<this.jobs.length;i++) {
			var job = this.jobs[i];
			var match = true;
			for(var k=0;k<searchKeys;k++) {
				if (job[searchKeys[k]] !== search[searchKeys[k]]) {
					match = false;
				}
			}
			if (match) {
				result.push(job);
			}
		};
		return result;
	},
	killJobWithId(id) {
		for(var i=0;i<this.jobs.length;i++) {
			var job = this.jobs[i];
			if (job.id == id) {
				job.kill();
				return;
			}
		}
	}
}

module.exports = JobManager;