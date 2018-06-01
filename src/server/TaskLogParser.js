const extend = require('extend');

class TaskLogParser {
  constructor(options) {
    const defaults = {
      commands: {
        UPDATE(task, key, value) {
          task.state.mutateState(key, value);
        },
        PUSH(task, key, value) {
          task.state.mutateData(key, value);
        },
        POP(task, key, value) {
          task.state.mutateDataDelete(key, value);
        },
        ENDPOINT(task, key, value) {
          task.state.mutateEndpoints(key, value);
        },
      },
      logSize: 10,
    };

    options = extend({}, defaults, options);
    this.commands = options.commands;
    this.logSize = options.logSize;
    this.logTail = [];
  }

  parseLine(task, line) {
    const groups = line.match(/\*\*\* (\w+) \*\*\*\s*([^\s\=]+)\s*\=(.*)/);
    if (groups) {
      const command = groups[1].trim();
      const key = groups[2].trim();
      let value = groups[3].trim();
      try {
        value = JSON.parse(value);
      } catch (error) {
        value = error;
      }

      if (command in this.commands) {
        this.commands[command](task, key, value);
        return;
      }
    }

    // record line
    task.state.mutateLog(line);

    this.logTail.push(line);
    if (this.logTail.length > this.logSize) {
      this.logTail.shift();
    }
  }
}

module.exports = TaskLogParser;
