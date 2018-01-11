const uuid = require('uuid/v4');
const clone = require('clone');
var { MutableState } = require('./MutableState');
var Task = require('./Task');

const ee = require('event-emitter');

/**
 * TaskManager API
 * 
 * methods:
 * 		start(details,callback) -> start new task
 * 		tasks() -> return list of tasks states
 * 		hasTaskWithId(id) -> return true is task exists
 * 		killTaskById(id) -> kill a task by a given id
 * 		
 * events:
 * 		new-task , MutableState
 * 		task-end , MutableState
 * 		mutate	 , MutableState
 * 
 */

class LocalTaskManager {
	constructor(master) {
		this.streamEvent = false;
		this.master = undefined;
		this._tasks = [];

		this.attachMaster(master);
	}

	attachMaster(master) {
		this.master = master;

		if (this.master) {
			let self = this;

			this.master.on('connect', function () {
				self.streamEvent = true;
				self.master.emit('tasks', self.tasks());
			});

			this.master.on('new-task', function(details) {
				self.start(details);
			});

			this.master.on('kill-task', function(id) {
				self.killTaskById(id);
			});

			this.master.on('disconnect', function () {
				self.streamEvent = false;
			});
		}
	}

	/**
	 * @param {Task} state 
	 */
	track(task) {
		this._tasks.push(task);
		let self = this;

		if (self.streamEvent) {
			self.master.emit('task', task.state);
		}

		task.state.on('mutate', function (update) {
			if (self.streamEvent) {
				let updateWithId = clone(update);
				updateWithId.id = task.state.id;
				self.master.emit('mutate', updateWithId);
			}

			self.emit('mutate',task.state);
		});

		task.state.on('start', function() {
			self.emit('new-task',task.state);
		});

		task.state.on('exit', function () {
			let index = self._tasks.indexOf(task);
			if (index !== -1) {
				self._tasks.splice(index, 1);
			}

			if (self.streamEvent) {
				self.master.emit('task-end', task.state.id);
			};

			self.emit('task-end',task.state);
		});
	}

	start(details, callback) {
		let task = new Task(details);
		if (callback) {
			task.state.on('start',() => callback(task.state) );
		}

		this.track(task);

		setImmediate(() => task.start());
	}

	hasTaskWithId(id) {
		for (let task of this._tasks) {
			if (task.state.id === id) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {string} id 
	 * @returns {Task|undefined} task
	 */
	getTaskById(id) {
		for (let task of this._tasks) {
			if (task.state.id === id) {
				return task;
			}
		}
		return undefined;
	}

	killTaskById(id) {
		let task = this.getTaskById(id);
		if (task) {
			task.kill();
		}
	}

	tasks() {
		return this._tasks.map(task => task.state);
	}
	
}

class RemoteTaskManager {
	constructor(node) {
		this.connected = true;
		this.node = node;
		this.id = node.id.replace('/node#','').substr(0,5);
		this._tasks = [];
		this.completedTasks = [];
		this._tasksLookup = {};

		this._startRequests = {};

		if (this.node) {
			let self = this;

			this.node.on('connect', function () {
				self.connected = true;
			});

			this.node.on('disconnect', function () {
				self.connected = false;
			});

			this.node.on('task', function (task) {
				let state = new MutableState(task);
				state.node = self.id;

				self._tasksLookup[state.id] = state;
				self._tasks.push(state);

				//invoke callback
				if (state.id in self._startRequests) {
					self._startRequests[state.id](state);
					delete self._startRequests[state.id];
				}

				self.emit('new-task', state);
			});

			this.node.on('task-end', function (id) {
				let state = self._tasksLookup[id];
				if (state) {
					let index = self._tasks.indexOf(state);
					if (index !== -1) {
						self._tasks.splice(index, 1);
					}
					delete self._tasksLookup[id];

					self.completedTasks.push(state);
					if (self.completedTasks.length > 10) {
						self.completedTasks.shift();
					}

					self.emit('task-end', state);
				}
			});

			this.node.on('tasks', function (tasks) {
				self._tasks = tasks.map(task => {
					let state = new MutableState(task);
					state.node = self.id;
					return state;
				});
				self._tasksLookup = {};
				self._tasks.forEach(task => { self._tasksLookup[task.id] = task });
			});

			this.node.on('mutate', function (update) {
				if (update.id in self._tasksLookup) {

					let state = self._tasksLookup[update.id];
					state.mutate(update);
					self.emit('mutate', state);
				}
			});
		}
	}

	start(details, callback) {
		if (!details.id) {
			//fix details to have an id, without modify the details object
			details = clone(details);
			details.id = uuid();
		}
		if (callback) {
			this._startRequests[details.id] = callback;
		}
		this.node.emit('new-task', details);
	}

	hasTaskWithId(id) {
		return id in this._tasksLookup;
	}

	getTaskById(id) {
		return this._tasksLookup[id];
	}

	killTaskById(id) {
		this.node.emit('kill-task',id);
	}

	tasks() {
		return this._tasks;
	}
}

class ClusterTaskManager {
	constructor(socket) {
		this.socket = socket;
		this._nodes = [];
		this.nextNode = 0;
		let self = this;

		this.socket.on('connection', (nodeSocket) => {
			let node = self.addNode(nodeSocket.id, new RemoteTaskManager(nodeSocket));

			self.emit('new-node');

			//remove if needed.
			nodeSocket.on('disconnect', function () {
				node.detach();

				self.emit('node-detach');
			});
		});
	}

	addNode(id,manager) {
		let self = this;

		let node = {
			id: id,
			manager : manager
		};
		//aggregate all events
		node.manager.on('new-task', (task) => self.emit('new-task', task));
		node.manager.on('task-end', (task) => self.emit('task-end', task));
		node.manager.on('mutate', (task) => self.emit('mutate', task));

		//add detach method for future use
		node.detach = function() {
			self._nodes.splice(self._nodes.indexOf(node), 1);

			self.emit('node-disconnected', node);
		}

		//push it to the nodes list.
		this._nodes.push(node);
		this.emit('node-connected', node);

		return node;
	}

	start(details, callback) {
		this.nextNode = (this.nextNode + 1) % this._nodes.length;
		let node = this._nodes[this.nextNode];
		node.manager.start(details, callback);
	}

	killTaskById(id) {
		for (let node of this._nodes) {
			if (node.manager.hasTaskWithId(id)) {
				node.manager.killTaskById(id);
				return;
			}
		}
	}

	getTaskById(id) {
		for (let node of this._nodes) {
			if (node.manager.hasTaskWithId(id)) {
				return node.manager.getTaskById(id);
			}
		}
		return undefined;
	}

	tasks() {
		return this._nodes.reduce(function (result, node) {
			return result.concat(node.manager.tasks())
		}, []);
	}

	nodes() {
		return this._nodes.map(function(node) {
			let tasks = node.manager.tasks();

			return {
				id: node.id,
				tasks: tasks.length,
				memory: tasks.reduce((total,task) => total + task.usage.memory , 0),
				cpu: tasks.reduce((total,task) => total + task.usage.cpu , 0)
			}
		});
	}
}

ee(LocalTaskManager.prototype);
ee(RemoteTaskManager.prototype);
ee(ClusterTaskManager.prototype);

module.exports = {
	LocalTaskManager,
	RemoteTaskManager,
	ClusterTaskManager
};