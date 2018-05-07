const uuid = require('uuid/v4');
const clone = require('clone');
const path = require('path');
var { MutableState } = require('./MutableState');
var Task = require('./Task');
var Repo = require('./Repo');

const ee = require('event-emitter');

/**
 * TaskManager API
 * 
 * methods:
 * 		start(details,callback) -> start new task
 * 		tasks() -> return list of tasks states
 * 		nodes() -> return list of nodes with ids
 * 		hasTaskWithId(id) -> return true is task exists
 * 		killTaskById(id) -> kill a task by a given id
 * 		
 * events:
 * 		new-task , MutableState
 * 		task-end , MutableState
 * 		mutate	 , MutableState, UpdateInfo
 * 
 *      node-connected, Node
 *      node-disconnected, Node
 */

class LocalTaskManager {
	constructor(master, config) {
		this.streamEvent = false;
		this.master = undefined;
		this.config = config;
		this._tasks = [];
		this.id = uuid();

		this.attachMaster(master);
	}

	attachMaster(master) {
		this.master = master;

		if (this.master) {
			let self = this;

			this.master.on('connect', function () {
				self.streamEvent = true;
				self.master.emit('setup', {
					nodes: [{
						id: self.id,
					}],
					tasks: self.tasks(),
				});
			});

			this.master.on('start-task', function (details) {
				self.start(details);
			});

			this.master.on('kill-task', function (id) {
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
			self.master.emit('new-task', task.state);
		}

		task.state.on('mutate', function (update) {
			let updateWithId = clone(update);
			updateWithId.id = task.state.id;

			if (self.streamEvent) {
				self.master.emit('mutate', updateWithId);
			}

			self.emit('mutate', task.state, updateWithId);
		});

		task.state.on('start', function () {
			self.emit('new-task', task.state);
		});

		task.state.on('exit', function () {
			let index = self._tasks.indexOf(task);
			if (index !== -1) {
				self._tasks.splice(index, 1);
			}

			if (self.streamEvent) {
				self.master.emit('task-end', task.state.id);
			};

			self.emit('task-end', task.state);
		});
	}

	_resolveProduct(product, version, callback) {
		if (!this.repo) {
			this.repo = new Repo(this.config.repo);
		}

		if (!this.resolveRequests) {
			this.resolveRequests = {};
		}

		let key = product + ":" + (version || 'latest');

		if (!(key in this.resolveRequests)) {
			this.resolveRequests[key] = this.repo.download(product, version);
		}

		this.resolveRequests[key].then((path) => callback(null, path), (error) => callback(error, null));
	}

	_resolveDetails(details, callback) {
		if (details.product) {
			this._resolveProduct(details.product, details.version, (error, productPath) => {
				if (error) {
					callback(error, details);
				} else {
					let resolvedDetails = clone(details);
					delete resolvedDetails.product;
					delete resolvedDetails.version;

					productPath = path.resolve(productPath);
					resolvedDetails.cwd = productPath;
					resolvedDetails.exec = path.join(productPath, resolvedDetails.exec);
					callback(null, resolvedDetails);
				}
			});
		} else {
			callback(null, details);
		}
	}

	start(details, callback) {
		this._resolveDetails(details, (error, resolvedDetails) => {
			let task = new Task(resolvedDetails);

			//overwrite node and app details
			task.state.details.node = this.id;
			if (details.app) {
				task.state.details.app = task.state.details.app || details.app;
			}

			if (callback) {
				task.state.on('start', () => callback(task.state));
			}

			this.track(task);

			setImmediate(() => task.start());
		});
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

	nodes() {
		return [{ id: this.id }]
	}
}

class RemoteTaskManager {
	constructor(node) {
		this.connected = true;
		this.node = node;
		this._tasks = [];
		this._nodes = [];
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

			this.node.on('setup', function (details) {
				self._tasks = details.tasks.map(task => new MutableState(task));
				self._tasksLookup = {};
				self._tasks.forEach(task => { self._tasksLookup[task.id] = task });
				self._nodes = details.nodes;

				self.emit('ready');
			});

			this.node.on('new-task', function (task) {
				let state = new MutableState(task);
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

			this.node.on('mutate', function (update) {
				if (update.id in self._tasksLookup) {

					let state = self._tasksLookup[update.id];
					state.mutate(update);
					self.emit('mutate', state, update);
				}
			});

			this.node.on('node-connected', function (node) {
				self._nodes.push(node);
				self.emit('node-connected', node);
			});

			this.node.on('node-disconnected', function (node) {
				for (let i = 0; i < self._nodes.length; i++) {
					let existingNode = self._nodes[i];
					if (existingNode.id == node.id) {
						self._nodes.splice(i, 1);
					}
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
		this.node.emit('start-task', details);
	}

	hasTaskWithId(id) {
		return id in this._tasksLookup;
	}

	getTaskById(id) {
		return this._tasksLookup[id];
	}

	killTaskById(id) {
		this.node.emit('kill-task', id);
	}

	tasks() {
		return this._tasks;
	}

	nodes() {
		return this._nodes;
	}
}

class ClusterTaskManager {
	constructor(socket) {
		this.socket = socket;
		this._nodes = [];
		this.id = uuid();
		this.nextNode = 0;
		let self = this;

		this.socket.on('connection', (nodeSocket) => {
			let node = self.addNode(nodeSocket.id || uuid(), new RemoteTaskManager(nodeSocket));

			//remove if needed.
			nodeSocket.on('disconnect', function () {
				node.detach();
			});
		});
	}

	addNode(id, manager) {
		let self = this;

		let node = {
			id: id,
			manager: manager
		};
		//aggregate all events
		node.manager.on('new-task', (task) => self.emit('new-task', task));
		node.manager.on('task-end', (task) => self.emit('task-end', task));
		node.manager.on('mutate', (task, update) => self.emit('mutate', task, update));
		node.manager.on('node-connected', (node) => self.emit('node-connected', node));
		node.manager.on('node-disconnected', (node) => self.emit('node-disconnected', node));

		//add detach method for future use
		node.detach = function () {
			self._nodes.splice(self._nodes.indexOf(node), 1);

			for (let nodeDetails of node.manager.nodes()) {
				self.emit('node-disconnected', nodeDetails);
			}
		}

		//push it to the nodes list.
		this._nodes.push(node);

		//notify when nodes are connected
		if (node.manager.nodes().length > 0) {
			for (let nodeDetails of node.manager.nodes()) {
				self.emit('node-connected', nodeDetails);
			}
		} else {
			node.manager.on('ready', function () {
				for (let nodeDetails of node.manager.nodes()) {
					self.emit('node-connected', nodeDetails);
				}
			});
		}

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
		return this._nodes.reduce(function (result, node) {
			return result.concat(node.manager.nodes())
		}, []);
		/*
		return this._nodes.map(function(node) {
			let tasks = node.manager.tasks();

			return {
				id: node.id,
				tasks: tasks.length,
				memory: tasks.reduce((total,task) => total + task.usage.memory , 0),
				cpu: tasks.reduce((total,task) => total + task.usage.cpu , 0)
			}
		});
		*/
	}

	expose(io) {
		let self = this;
		io.on('connect', function (socket) {
			let appDetails = {};

			socket.emit('setup', {
				tasks: self.tasks(),
				nodes: self.nodes()
			});

			socket.on('setup', function (app) {
				appDetails.id = app.id;
			})

			socket.on('start-task', function (details) {
				//overwrite app id.
				if (appDetails.id) {
					details.app = appDetails.id;
				}

				self.start(details);
			});

			socket.on('kill-task', function (id) {
				self.killTaskById(id);
			});

			socket.on('disconnect', function () {
			});
		});

		self.on('new-task', function (task) {
			io.emit('new-task', task);
		});

		self.on('task-end', function (task) {
			io.emit('task-end', task);
		});

		self.on('mutate', function (task, update) {
			io.emit('mutate', update);
		});

		self.on('node-connected', function (node) {
			io.emit('node-connected', node);
		});

		self.on('node-disconnected', function (node) {
			io.emit('node-disconnected', node);
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