var extend = require('extend');
const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
const processUsage = require('pidusage');
const JobLogParser = require('./JobLogParser');

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

			//default data is empty
			data: {},

			//log parser, that go over every line
			//default log parser look for '*** [COMMAND] *** key=value'
			logParser: new JobLogParser(),
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
		this.logParser = options.logParser;
		
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

		function parseLine(line) {
			var parseResult;
			if (line) {
				parseResult = self.logParser.parseLine(self, line);
				self.ee.emit('line', self, line);
			}
			return parseResult;
		}

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

				if (parseLine(line)=='info') {
					infoUpdated = true;
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
			parseLine(stdout);
			
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