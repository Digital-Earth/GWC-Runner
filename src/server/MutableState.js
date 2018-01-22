const uuid = require('uuid/v4');
const clone = require('clone');
const ee = require('event-emitter');

const StatusCodes = {
	'new': 'new',
	'running': 'running',
	'terminating': 'terminating',
	'done': 'done',
	'error': 'error',
	'cancelled': 'cancelled'
};

class MutableState
{
	constructor(state) {
		state = state || {};
		this.id = state.id || uuid();
		this.name = state.name || this.id;
		this.status = state.status || StatusCodes.new;

		//details are the invoke data for the tasks, can't be changed
		this.details = clone(state.details) || {};

		//state is an object can be changed over time of the tasks
		this.state = clone(state.state) || {};

		//usage is updated every X seconds and measure cpu and memory usage, plus idle indication
		this.usage = clone(state.usage) || {};

		//data is an object of lists that can accumulate data items. good for aggregate results from tasks.
		this.data = clone(state.data) || {};

		//endpoints allow tasks to publish access information to the task
		this.endpoints = clone(state.endpoints) || {};

		//keep a short log for the task
		this.log = [];
	}

	mutate(update) {
		switch(update.type) {
			case 'status':
				this.mutateStatus(update.value);
				break;

			case 'state':
				this.mutateState(update.key,update.value);
				break;

			case 'usage':
				this.mutateUsage(update.value);
				break;

			case 'data':
				this.mutateData(update.key,update.value);
				break;

			case 'data-delete':
				this.mutateDataDelete(update.key,update.value);
				break;

			case 'endpoints':
				this.mutateEndpoints(update.key,update.value);

			case 'log':
				this.mutateLog(update.value);
				break;

			default:
				console.log('unsupported update type ' + update.type);
				break;
		}
	}

	mutateStatus(value) {
		if (this.status !== value) {
			this.status = value;
			this.emit('mutate', {
				type:'status',
				value: value
			});

			switch(this.status) {
				case StatusCodes.running:
					this.emit('start', this);
					break;
				case StatusCodes.done:
				case StatusCodes.error:
					this.emit('exit', this);
					break;
			}
		}
	}

	mutateState(key,value) {
		if (this.state[key] !== value) {
			this.state[key] = value;
			this.emit('mutate', {
				type:'state',
				key: key,
				value: value
			});
		}
	}

	mutateUsage(usage) {
		this.usage = usage;
		this.emit('mutate', {
			type:'usage',
			value: usage
		});
	}

	mutateData(key,value) {
		this.data = this.data || {};
		this.data[key] = this.data[key] || [];
		this.data[key].push(value);
		this.emit('mutate', {
			type:'data',
			key: key,
			value: value
		});
	}

	mutateDataDelete(key,value) {
		this.data = this.data || {};
		this.data[key] = this.data[key] || [];
		let index = this.data[key].indexOf(value);
		if (index !== -1) {
			this.data[key].splice(index,1);
			this.emit('mutate', {
				type:'data-delete',
				key: key,
				value: value
			});
		}
	}

	mutateEndpoints(key,value) {
		if (value) {
			if (this.endpoints[key] !== value) {
				this.endpoints[key] = value;
				this.emit('mutate', {
					type:'endpoints',
					key: key,
					value: value
				});
			}
		} else {
			if (key in this.endpoints) {
				delete this.endpoints[key];
				this.emit('mutate', {
					type:'endpoints',
					key: key,
					value: value
				});
			}
		}
	}

	mutateLog(value) {
		this.log.push(value);
		if (this.log.length > 10) {
			this.log.shift();
		}
		this.emit('mutate', {
			type:'log',
			value: value
		});
	}
}

ee(MutableState.prototype);

module.exports = {
	MutableState,
	StatusCodes
}