var extend = require('extend');
const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
const processUsage = require('pidusage');

const StatusCodes = {
	'new': 'new',
	'running': 'running',
	'terminating': 'terminating',
	'done': 'done'
};

const JobManager = require('./JobManager');

let jobIndex = 0;

class Job {
	constructor(options) {
		this.id = jobIndex++;

		let defaults = {
			//default job name
			name: "job #" + jobIndex,

			//default cwd of the process
			cwd: process.cwd(),
			
			//can be used to send the process a kill command through stdin. for example, GeoWebCore expect 'x' to exit
			killCommand: undefined,
			
			//how long to wait until the kill command take affect
			killCommandTimeout: 30 * 1000,

			//how quickly to update the CPU/Memory load
			usageRefreshRate: 5 * 1000,

			//default info is empty
			info: {},

			//to parse the stdout and look for '*** UPDATE *** key=value and update the process info
			updateInfoFromStdout: true,
		}

		options = extend({}, defaults, options)

		this.name = options.name;
		this.info = options.info;
		this.cwd = options.cwd;
		this.exec = options.exec;
		this.args = options.args;

		this.killCommand = options.killCommand;
		this.killCommandTimeout = options.killCommandTimeout;
		this.usageRefreshRate = options.usageRefreshRate;

		this.updateInfoFromStdout = options.updateInfoFromStdout;

		this.logFile = options.logFile;
		this.logTail = [];

		if (this.logFile) {
			this.logStream = fs.createWriteStream(this.logFile);
		}

		this.ee = new EventEmitter();

		this.status = StatusCodes.new;

		this.ee.on('exit', function () {
			if (this.logStream) {
				this.logStream.end();
			}
		})

		if (options.on) {
			for (var eventName in options.on) {
				this.ee.on(eventName, options.on[eventName]);
			}
		}
	}

	start() {
		if (this.childProcess) {
			return;
		}

		JobManager.track(this);

		let self = this;
		let child = this.childProcess = spawn(this.exec, this.args, {
			cwd: this.cwd
		});

		var stdout = '';

		child.stdout.on('data', function (data) {
			if (self.logStream) {
				self.logStream.write(data);
			}
			self.ee.emit('stdout', self, data);

			stdout += data.toString();

			var infoUpdated = false;

			//emit all lines
			while (stdout.indexOf('\n') != -1) {
				var pos = stdout.indexOf('\n');
				var line = stdout.substr(0, pos);
				stdout = stdout.substr(pos + 1);
				if (line) {
					var automationLine = false;

					//search for automation lines:
					// *** UPDATE ** key=value - is handled by default
					// *** PUSH *** key=value or any other command if will emit 'automation' event for job to handle
					if (self.updateInfoFromStdout && line.startsWith('*** ')) {
						var groups = line.match(/\*\*\* (\w+) \*\*\*\s*(\S+)\s*\=(.*)/);
						if (groups) {
							
							var command = groups[1].trim();
							var key = groups[2].trim();
							var value = groups[3].trim();
							try {
								value = JSON.parse(value);
							} catch(error) {
								value = error;
							}
							switch(command) {
								case 'UPDATE':
									self.info[key] = value;
									infoUpdated = true;
									automationLine = true;
									break;
								default:
									if (self.ee.emit('automation',self,command,key,value)) {
										automationLine = true;
									}
							}
						}
					} 
					
					//add into log if not automation line
					if (!automationLine) {
						self.logTail.push(line);
						if (self.logTail.length > 10) {
							self.logTail.shift();
						}
					}

					self.ee.emit('line', self, line);
				}
			}

			if (infoUpdated) {
				self.ee.emit('info', self);
			}
		});

		child.stderr.on('data', function (data) {
			if (self.logStream) {
				self.logStream.write(data);
			}
			self.ee.emit('stderr', self, data);
		});

		child.on('exit', function (code) {
			//emit the last line
			if (stdout) {
				self.ee.emit('line', self, stdout);
			}
			self.exitCode = code;
			self.status = StatusCodes.done;

			if (self.updateUsageTimeoutId) {
				clearTimeout(self.updateUsageTimeoutId);
			}
			processUsage.unmonitor(self.pid)

			self.ee.emit('exit', self, code);
		});

		child.on('error', function (error) {
			self.ee.emit('error', self, error);
		});

		this.pid = child.pid;
		this.status = StatusCodes.running;
		this.info.startTime = new Date();
		this.usage = { cpu: 0, memory: 0 };
		this.updateUsage();
	}

	updateUsage() {
		if (this.status === StatusCodes.running) {
			var self = this;
			processUsage.stat(this.pid, function (err, usage) {
				if (!err) {
					self.usage = usage;

					//measure idle item
					if (self.usage.cpu < 1) {
						self.info.idleFrom = self.info.idleFrom || new Date();
					} else {
						delete self.info.idleFrom;
					}
				}

				self.ee.emit('usage', self, self.usage);

				//register another check
				self.updateUsageTimeoutId = setTimeout(function () { self.updateUsage(); }, self.usageRefreshRate);
			});
		}
	}

	kill() {
		if (this.status === StatusCodes.terminating || this.status === StatusCodes.done) {
			return;
		}

		this.start = StatusCodes.terminating;

		if (this.killCommand) {
			var self = this;
			this.childProcess.stdin.write(this.killCommand + '\n');
			setTimeout(function () { self.forceKill(); }, this.killCommandTimeout);
		} else {
			this.forceKill();
		}
	}

	forceKill() {
		if (this.status !== 'done' && !this.childProcess.killed) {
			this.childProcess.kill();
		}
	}

	on(event, callback) {
		this.ee.on(event, callback);
	}

	off(event, callback) {
		this.ee.removeListener(event, callback);
	}

	once(event, callback) {
		this.ee.once(event, callback);
	}
}

module.exports = Job;