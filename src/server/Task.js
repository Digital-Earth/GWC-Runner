const extend = require('extend');
const { spawn } = require('child_process');
const fs = require('fs');
const processUsage = require('pidusage');
const TaskLogParser = require('./TaskLogParser');
const { MutableState, StatusCodes } = require('./MutableState');
const es6template = require('es6-template');

const statusToKill = {
  [StatusCodes.running]: true,
};

class Task {
  constructor(options) {
    const defaults = {
      id: undefined,

      name: undefined,

      // default cwd of the process
      cwd: process.cwd(),

      // can be used to send the process a kill command through stdin.
      // for example, GeoWebCore expect 'x' to exit
      killCommand: undefined,

      // how long to wait until the kill command take affect
      killCommandTimeout: 30 * 1000,

      // how long to wait before killing the application if idle for long
      killAfterIdle: undefined,

      // how quickly to update the CPU/Memory load
      usageRefreshRate: 5 * 1000,

      // default state is empty
      state: {},

      // default data is empty
      data: {},

      details: {},

      // log parser, that go over every line
      // default log parser look for '*** [COMMAND] *** key=value'
      logParser: new TaskLogParser(),
    };

    // eslint-disable-next-line no-param-reassign
    options = extend({}, defaults, options);

    this.state = new MutableState({
      id: options.id,
      name: options.name,
      status: StatusCodes.new,
      state: options.state,
      data: options.data,
      details: options.details,
      endpoints: options.endpoints,
    });

    this.cwd = options.cwd;
    this.exec = options.exec;
    this.args = options.args;
    this.env = options.env;

    this.killCommand = options.killCommand;
    this.killCommandTimeout = options.killCommandTimeout;
    this.usageRefreshRate = options.usageRefreshRate;
    this.killAfterIdle = options.killAfterIdle;
    console.log('killAfterIdle', this.killAfterIdle);

    this.logFile = options.logFile;
    this.logParser = options.logParser;
  }

  start() {
    if (this.childProcess) {
      return;
    }

    // use env to extend the vairables like path and appdata required for apps to run correctly
    const env = extend({}, process.env, this.env);

    const self = this;
    const child = spawn(this.exec, this.args, {
      cwd: this.cwd,
      env,
    });
    this.childProcess = child;

    if (this.logFile) {
      let time = new Date().toISOString(); // = '2018-05-25T16:54:05.245Z'
      time = time.replace(/[-:]/g, '-').replace('T', '.').substr(0, 19); // = '2018-05-25.16-54-05'

      this.logFile = es6template(this.logFile, {
        name: this.state.name,
        id: this.state.id,
        pid: child.pid,
        time,
      });
      this.logStream = fs.createWriteStream(this.logFile);
    }

    let stdout = '';

    function parseLine(line) {
      if (line) {
        self.logParser.parseLine(self, line);
      }
    }

    child.stdout.on('data', (data) => {
      if (self.logStream) {
        self.logStream.write(data);
      }

      stdout += data.toString();

      // emit all lines
      while (stdout.indexOf('\n') !== -1) {
        const pos = stdout.indexOf('\n');
        const line = stdout.substr(0, pos);
        stdout = stdout.substr(pos + 1);
        parseLine(line);
      }
    });

    child.stderr.on('data', (data) => {
      if (self.logStream) {
        self.logStream.write(data);
      }
    });

    child.on('close', (code) => {
      // emit the last line
      parseLine(stdout);

      self.state.mutateState('endTime', new Date());
      self.state.mutateState('exitCode', code);
      self.state.mutateStatus(StatusCodes.done);

      if (self.updateUsageTimeoutId) {
        clearTimeout(self.updateUsageTimeoutId);
      }
      processUsage.unmonitor(self.pid);
    });

    child.on('error', (error) => {
      self.state.mutateState('error', error);
      self.state.mutateStatus(StatusCodes.error);
    });

    this.pid = child.pid;

    self.state.mutateStatus(StatusCodes.running);
    self.state.mutateState('startTime', new Date());
    self.state.mutateState('pid', this.pid);
    self.state.mutateUsage({ cpu: 0, memory: 0 });

    this.updateUsage();
  }

  updateUsage() {
    if (this.state.status === StatusCodes.running) {
      const self = this;
      processUsage.stat(this.pid, (err, usage) => {
        if (!err) {
          const newUsage = extend({}, self.state.usage, usage);

          // measure idle item
          if (newUsage.cpu < 1) {
            newUsage.idleFrom = newUsage.idleFrom || new Date();
          } else {
            delete newUsage.idleFrom;
          }

          self.state.mutateUsage(newUsage);
        }

        console.log('idleTime', self.idleTime);
        if (self.killAfterIdle && self.idleTime > self.killAfterIdle) {
          self.kill();
        }

        // register another check
        self.updateUsageTimeoutId = setTimeout(() => {
          self.updateUsage();
        }, self.usageRefreshRate);
      });
    }
  }

  kill() {
    if (!statusToKill[this.state.status]) {
      return;
    }

    this.state.mutateStatus(StatusCodes.terminating);

    if (this.killCommand) {
      const self = this;
      this.childProcess.stdin.write(`${this.killCommand}\n`);
      setTimeout(() => { self.forceKill(); }, this.killCommandTimeout);
    } else {
      this.forceKill();
    }
  }

  forceKill() {
    if (this.state.status !== StatusCodes.done && !this.childProcess.killed) {
      this.childProcess.kill();
    }
  }

  get idleTime() {
    if (this.state.usage.idleFrom) {
      return new Date().getTime() - this.state.usage.idleFrom.getTime();
    }
    return 0;
  }
}

module.exports = Task;
