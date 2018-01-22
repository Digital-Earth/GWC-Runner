var extend = require('extend');

class TaskLogParser {

	constructor(options) {
		var defaults = {
			commands: {
				'UPDATE': function (task, key, value) {
					task.state.mutateState(key,value);
				},
				'PUSH': function (task, key, value) {
					task.state.mutateData(key, value);
				},
				'ENDPOINT': function (task, key, value) {
					task.state.mutateEndpoints(key, value);
				}
			},
			logSize: 10,
		}

		options = extend({}, defaults, options);
		this.commands = options.commands;
		this.logSize = options.logSize;
		this.logTail = [];
	}

	parseLine(task, line) {
		var groups = line.match(/\*\*\* (\w+) \*\*\*\s*([^\s\=]+)\s*\=(.*)/);
		if (groups) {

			var command = groups[1].trim();
			var key = groups[2].trim();
			var value = groups[3].trim();
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
		
		//record line
		task.state.mutateLog(line);

		this.logTail.push(line);
		if (this.logTail.length > this.logSize) {
			this.logTail.shift();
		}
	}
}

module.exports = TaskLogParser