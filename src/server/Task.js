const extend = require('extend');
const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
const processUsage = require('pidusage');
const TaskLogParser = require('./TaskLogParser');
const { MutableState, StatusCodes } = require('./MutableState');

class Task {
	constructor(options) {
		let defaults = {
			id: undefined,

			name: undefined,

			//default cwd of the process
			cwd: process.cwd(),

			//can be used to send the process a kill command through stdin. for example, GeoWebCore expect 'x' to exit
			killCommand: undefined,

			//how long to wait until the kill command take affect
			killCommandTimeout: 30 * 1000,

			//how quickly to update the CPU/Memory load
			usageRefreshRate: 5 * 1000,

			//default state is empty
			state: {},

			//default data is empty
			data: {},

			details: {},

			//log parser, that go over every line
			//default log parser look for '*** [COMMAND] *** key=value'
			logParser: new TaskLogParser(),
		}

		options = extend({}, defaults, options);

		this.state = new MutableState({
			id: options.id,
			name: options.name,
			status: StatusCodes.new,
			state: options.state,
			data: options.data,
			details: options.details
		});

		this.cwd = options.cwd;
		this.exec = options.exec;
		this.args = options.args;

		this.killCommand = options.killCommand;
		this.killCommandTimeout = options.killCommandTimeout;
		this.usageRefreshRate = options.usageRefreshRate;
		this.lastIoTime = new Date();

		this.logFile = options.logFile;
		this.logParser = options.logParser;

		if (this.logFile) {
			this.logStream = fs.createWriteStream(this.logFile);
		}

		//TODO: remove?
		this.ee = new EventEmitter();

		this.ee.on('exit', function () {
			if (this.logStream) {
				this.logStream.end();
			}
		})

		//TODO: remove?
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

		let self = this;
		let child = this.childProcess = spawn(this.exec, this.args, {
			cwd: this.cwd
		});

		var stdout = '';

		function parseLine(line) {
			if (line) {
				self.logParser.parseLine(self, line);
			}
		}

		child.stdout.on('data', function (data) {

			self.lastIoTime = new Date();
			if (self.logStream) {
				self.logStream.write(data);
			}
			self.ee.emit('stdout', self, data);

			stdout += data.toString();

			//emit all lines
			while (stdout.indexOf('\n') != -1) {
				var pos = stdout.indexOf('\n');
				var line = stdout.substr(0, pos);
				stdout = stdout.substr(pos + 1);
				parseLine(line);
			}
		});

		child.stderr.on('data', function (data) {
			self.lastIoTime = new Date();
			if (self.logStream) {
				self.logStream.write(data);
			}
			self.ee.emit('stderr', self, data);
		});

		child.on('close', function (code) {
			//emit the last line
			parseLine(stdout);

			self.state.mutateState('endTime', new Date());
			self.state.mutateState('exitCode', code);
			self.state.mutateStatus(StatusCodes.done);

			if (self.updateUsageTimeoutId) {
				clearTimeout(self.updateUsageTimeoutId);
			}
			processUsage.unmonitor(self.pid)

			//TODO: remove?
			self.ee.emit('exit', self, code);
		});

		child.on('error', function (error) {

			self.state.mutateState('error', error);
			self.state.mutateStatus(StatusCodes.error);

			self.ee.emit('error', self, error);
		});

		this.pid = child.pid;

		self.state.mutateStatus(StatusCodes.running);
		self.state.mutateState('startTime', new Date());
		self.state.mutateUsage({ cpu: 0, memory: 0 });

		this.updateUsage();
	}

	updateUsage() {
		if (this.state.status === StatusCodes.running) {
			var self = this;
			processUsage.stat(this.pid, function (err, usage) {
				if (!err) {
					let newUsage = extend({}, self.state.usage, usage);

					//measure idle item
					if (newUsage.cpu < 1) {
						newUsage.idleFrom = newUsage.idleFrom || new Date();
						if (newUsage.idleFrom < self.lastIoTime) {
							newUsage.idleFrom = self.lastIoTime;
						}
					} else {
						delete newUsage.idleFrom;
					}

					self.state.mutateUsage(newUsage);
				}

				//register another check
				self.updateUsageTimeoutId = setTimeout(function () { self.updateUsage(); }, self.usageRefreshRate);
			});
		}
	}

	kill() {
		if (this.state.status === StatusCodes.terminating || this.state.status === StatusCodes.done || this.state.status === StatusCodes.error) {
			return;
		}

		this.state.mutateStatus(StatusCodes.terminating);

		if (this.killCommand) {
			var self = this;
			this.childProcess.stdin.write(this.killCommand + '\n');
			setTimeout(function () { self.forceKill(); }, this.killCommandTimeout);
		} else {
			this.forceKill();
		}
	}

	forceKill() {
		if (this.state.status !== StatusCodes.done && !this.childProcess.killed) {
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

module.exports = Task;