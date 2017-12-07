var extend = require('extend');

class JobLogParser {

	constructor(options) {
		var defaults = {
			commands: {
				'UPDATE': function (job, key, value) {
					if (job.info[key] !== value) {
						job.info[key] = value;
						return 'info';
					}
					return undefined;
				},
				'PUSH': function (job, key, value) {
					job.data = job.data || {};
					job.data[key] = job.data[key] || [];
					job.data[key].push(value);
					return 'data';
				}
			},
			logSize: 10,
		}

		options = extend({}, defaults, options);
		this.commands = options.commands;
		this.logSize = options.logSize;
		this.logTail = [];
	}

	parseLine(job, line) {
		var groups = line.match(/\*\*\* (\w+) \*\*\*\s*(\S+)\s*\=(.*)/);
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
				return this.commands[command](job, key, value);
			}
		}
		this.logTail.push(line);
		if (this.logTail.length > this.logSize) {
			this.logTail.shift();
		}
		return undefined;
	}
}

module.exports = JobLogParser