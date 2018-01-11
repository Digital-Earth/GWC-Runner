const clone = require('clone');
const uuid = require('uuid/v4');
const ee = require('event-emitter');
const { StatusCodes , MutableState } = require('./MutableState');

let serverContext = require('./ServerContext');

class SyncPoint {
	constructor() {
		this._triggered = false;
		this._value = undefined;
		this.ee = ee();
	}

	trigger(value) {
		if (!this._triggered) {
			this._triggered = true;
			this._value = value;
			this.ee.emit('event', value);
		}
	}

	on(callback) {
		if (this._triggered) {
			callback(this._value);
		} else {
			this.ee.once('event', callback);
		}
	}
}

class Action {
	constructor(job, trigger) {
		this.job = job;
		this.trigger = trigger;
		this.sync = new SyncPoint();
	}

	keepAlive(task, options) {
		options = options || {};
		if (!options.while) {
			options.while = function () { return true; }
		}
		return this.invoke(task, options);
	}

	invoke(task, options) {
		if (task instanceof Job) {
			if (options && options.while) {
				throw "same Job instance can't be used with options.while for multiple iterations. please change into a factory function";
			}
			let self = this;	
			return new PromiseAction(this.job, this.sync, function () {
				task.parent = self.job;
				task.start();
				return task;
			}, options);
		} else if (typeof task === 'function') {
			return new PromiseAction(this.job, this.sync, task, options);
		} else {
			return new TaskAction(this.job, this.sync, task, options);
		}
	}

	then(callback) {
		return new PromiseAction(this.job, this.sync, callback);
	}

	complete(value) {
		let forwardActionResult = arguments.length == 0;
		this.sync.on((result) => this.job.complete(forwardActionResult ? result : value));
	}

	forEach(items, callback, options) {
		options = options || {};

		let parallel = options.parallel || 1;

		let action = new Action(this.job, this.sync);

		let self = this;

		let total = items.length;
		let index = 0;
		let completed = 0;

		action.tasks = [];
		let results = [];

		function startNextTask() {
			action.running = true;
			while (action.tasks.length < parallel && index < items.length) {
				let itemIndex = index;
				index++;

				let item = items[itemIndex];

				let itemAction = self.then(function () {
					return callback(item);
				});

				action.tasks.push(itemAction);

				itemAction.then(function (result) {
					results[itemIndex] = result;

					action.tasks.splice(action.tasks.indexOf(itemAction), 1);
					completed++;

					if (completed == total) {
						action.running = false;
						action.result = results;
						action.sync.trigger(results);
					} else {
						startNextTask();
					}
				});
			}
		}

		this.then(startNextTask);

		return action;
	}
}

ee(Action.prototype);

class PromiseAction extends Action {
	constructor(job, trigger, callback, options) {

		super(job, trigger);

		options = options || {};
		this.while = options.while || function () { return false; };

		let self = this;

		function complete(value) {
			if (arguments.length > 0) {
				self.result = value;
			}
			if (self.while(value)) {
				doTask(value);
			} else {
				self.sync.trigger(value)
			}
		}

		function doTask(value) {
			let result = callback(value);

			if (result && result.sync) {
				self.running = true;

				//auto start a job
				if (result instanceof Job) {
					result.parent = self.job;
					result.start();
				}
				
				//wait until item completed
				result.sync.on((value) => {
					self.running = false;
					complete(value);
				});
			} else {
				complete(result);
			}
		};

		trigger.on((value) => {
			doTask(value);
		});
	}
}

class TaskAction extends Action {
	constructor(job, trigger, details, options) {
		super(job, trigger);

		this.details = clone(details);

		this.task = undefined;
		this.running = false;

		options = options || {};
		this.while = options.while || function () { return false; };

		let self = this;

		function killTask() {
			if (self.task) {
				serverContext.cluster.killTaskById(self.task.id);
			}
		}

		function startTask() {
			//add job id, we need to do it now because only here the jobParent might be known.
			self.details.details = self.details.details || {};
			self.details.details.job = self.job.getTopId();

			serverContext.cluster.start(self.details, (state) => {
				self.task = state;
				self.emit('start');

				state.on('exit', () => {
					self.task = undefined;
					self.result = state;

					if (self.job.status == StatusCodes.cancelled) {
						self.emit('cancelled');
						self.running = false;
						self.sync.trigger(self.result);
						return;
					} else {
						self.emit('done');
					}

					if (self.while(self.result)) {
						startTask();
					} else {
						self.running = false;
						self.sync.trigger(self.result);
					}
				});

				if (self.job.status != StatusCodes.running) {
					killTask();
				}
			});
		}

		this.trigger.on(() => {
			if (self.job.status == StatusCodes.cancelled) {
				self.emit('cancelled');
				self.sync.trigger();
				return;
			}

			this.running = true;

			startTask();
		});

		this.job.on('cancelled', () => {
			killTask();
			self.emit('cancelled');
		});
	}
}

class Job {
	constructor(name) {
		this.parent = null;
		this.id = uuid();
		this.name = name || this.id;
		
		this.state = new MutableState({
			id: this.id,
			name: this.name,
			status: StatusCodes.new
		});
		
		//start point
		this.root = new Action(this, null);

		//complete point
		this.sync = new SyncPoint();
	}

	get status() {
		return this.state.status;
	}

	set status(value) {
		this.state.mutateStatus(value);
	}

	getTopId() {
		if (this.parent) {
			return this.parent.getTopId();
		}
		return this.id;
	}

	start() {
		if (this.status == StatusCodes.new || this.status == StatusCodes.stopped) {
			this.status = StatusCodes.running;
			this.emit('start');
			this.root.sync.trigger();
		}
	}

	kill() {
		if (this.status == StatusCodes.new || this.status == StatusCodes.running || this.status.StatusCodes.stopped) {
			this.status = StatusCodes.cancelled;
			this.emit('cancelled');
			this.root.sync.trigger();
		}
	}

	complete(value) {
		if (this.status == StatusCodes.new || this.status == StatusCodes.running) {
			this.result = value;
			this.status = StatusCodes.done;
			this.sync.trigger(value);
			this.emit('done');
		}
	}

	keepAlive(task, options) {
		return this.root.keepAlive(task, options);
	}

	invoke(task, options) {
		return this.root.invoke(task, options)
	}

	forEach(items, callback, options) {
		return this.root.forEach(items, callback, options);
	}

	whenAll(...actions) {
		let count = 0;
		let action = new Action(this, this.root.sync);
		action.actions = actions;

		for (let a of actions) {
			a.sync.on(function (result) {
				count++;
				if (count == actions.length) {
					action.result = actions.map(aa => aa.result);
					action.sync.trigger(action.result);
				}
			});
		}

		return action;
	}

	whenFirst(...actions) {
		let action = new Action(this, this.root.sync);
		action.actions = actions;

		for (let a of actions) {
			a.sync.on(function (result) {
				//TODO: not overwrite the action result when second task is been called
				action.result = result;
				action.sync.trigger(result);
			});
		}

		return action;
	}
}

ee(Job.prototype);


/**
 * 
 * let job = new Job("gwc");
 * 
 * job.keepAlive({gwc});
 * 
 * 
 * let job = new Job("discoverAndValidate");
 * 
 * job	.invoke({list})
 * 		.invoke({discover})
 * 		.invoke({validate}, {while: (state) => state.state.datasets > 0 })
 * 		.then((state)=> {
 *  		if (!state.state.root) {
 * 			    return job.invoke({update});
 * 	 		}
 * 		})
 * 		.complete();
 * 
 * TODO:
 * job = new Job("lb");
 * 
 * action = job.keepAlive({lb}, {instancePerNode:1});
 *
 * for (number of servers) {
 * 		job	.keepAlive({gwc}, {'name':'server','endpoint':endpoint});
 * }
 * 
 * job.state.state['server'] = [endpoint1,endpoint2]
 * 
 * options:
 *    instances: number
 *    instancesPerNode: number
 *    nodes: { filters }
 *    name: set as named actions
 *    while: function for rerunning 
 */



module.exports = Job