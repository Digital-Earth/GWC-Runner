const uuid = require('uuid/v4');
const clone = require('clone');
const extend = require('extend');
const { MutableState, StatusCodes } = require('./MutableState');
const Task = require('./Task');

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
    this.id = config.id || uuid();
    this.info = extend({ id: this.id }, config.info);

    this.attachMaster(master);
  }

  attachMaster(master) {
    this.master = master;

    if (this.master) {
      const self = this;

      this.master.on('connect', () => {
        self.streamEvent = true;
        self.master.emit('setup', {
          nodes: [self.info],
          tasks: self.tasks(),
        });
      });

      this.master.on('start-task', (details) => {
        self.start(details);
      });

      this.master.on('kill-task', (id) => {
        self.killTaskById(id);
      });

      this.master.on('disconnect', () => {
        self.streamEvent = false;
      });
    }
  }

  /**
	 * @param {Task} state
	 */
  track(task) {
    this._tasks.push(task);
    const self = this;

    if (self.streamEvent) {
      self.master.emit('new-task', task.state);
    }

    task.state.on('mutate', (update) => {
      const updateWithId = clone(update);
      updateWithId.id = task.state.id;

      if (self.streamEvent) {
        self.master.emit('mutate', updateWithId);
      }

      self.emit('mutate', task.state, updateWithId);
    });

    task.state.on('start', () => {
      self.emit('new-task', task.state);
    });

    task.state.on('exit', () => {
      const index = self._tasks.indexOf(task);
      if (index !== -1) {
        self._tasks.splice(index, 1);
      }

      if (self.streamEvent) {
        self.master.emit('task-end', task.state.id);
      }

      self.emit('task-end', task.state);
    });
  }

  _resolveDetails(details, callback) {
    if (this.config.resolveDetails) {
      this.config.resolveDetails(details, callback);
    } else {
      callback(null, details);
    }
  }

  start(details, callback) {
    this._resolveDetails(details, (error, resolvedDetails) => {
      /* eslint-disable no-param-reassign */
      resolvedDetails.details.node = this.id;

      const task = new Task(resolvedDetails);

      if (callback) {
        task.state.on('start', () => callback(task.state));
      }

      this.track(task);

      setImmediate(() => task.start());
    });
  }

  hasTaskWithId(id) {
    for (const task of this._tasks) {
      if (task.state.id === id) {
        return true;
      }
    }
    return false;
  }

  hasNodeWithId(id) {
    return this.id === id;
  }

  /**
	 * @param {string} id
	 * @returns {MutableState|undefined} task
	 */
  getTaskById(id) {
    for (const task of this._tasks) {
      if (task.state.id === id) {
        return task.state;
      }
    }
    return undefined;
  }

  killTaskById(id) {
    for (const task of this._tasks) {
      if (task.state.id === id) {
        task.kill();
        return;
      }
    }
  }

  tasks() {
    return this._tasks.map(task => task.state);
  }

  nodes() {
    return [this.info];
  }
}

class RemoteTaskManager {
  constructor(node) {
    this.connected = true;
    this.node = node;
    this._tasks = [];
    this._nodes = [];
    this._tasksLookup = {};

    this._startRequests = {};

    if (this.node) {
      const self = this;

      this.node.on('connect', () => {
        self.connected = true;

        self.node.emit('setup', {
          tasks: self.tasks(),
          nodes: self.nodes(),
        });
      });

      this.node.on('disconnect', () => {
        self.connected = false;

        // report all active task has ended
        for (const task of this._tasks) {
          self.emit('task-end', task);
        }
        self._tasks = [];
        this._tasksLookup = [];

        // report all node as disconnected
        for (const nodeDetails of this._nodes) {
          self.emit('node-disconnected', nodeDetails);
        }
        this._nodes = [];
      });

      this.node.on('setup', (details) => {
        self._tasks = details.tasks.map(task => new MutableState(task));
        self._tasksLookup = {};
        self._tasks.forEach((task) => { self._tasksLookup[task.id] = task; });
        self._nodes = details.nodes;

        if (self.connected) {
          self.node.emit('setup', {
            tasks: self.tasks(),
            nodes: self.nodes(),
          });
        }

        self.emit('ready');
      });

      this.node.on('new-task', (task) => {
        console.log(`remote task ${task.id} started on node ${task.details.node}`);
        const state = new MutableState(task);
        self._tasksLookup[state.id] = state;
        self._tasks.push(state);

        // invoke callback
        if (state.id in self._startRequests) {
          self._startRequests[state.id](state);
          delete self._startRequests[state.id];
        }

        self.emit('new-task', state);
      });

      this.node.on('task-end', (id) => {
        const state = self._tasksLookup[id];
        if (state) {
          const index = self._tasks.indexOf(state);
          if (index !== -1) {
            self._tasks.splice(index, 1);
          }
          delete self._tasksLookup[id];

          // change task state to be lost before we kill it
          if (state.status === StatusCodes.running) {
            state.mutateStatus(StatusCodes.lost);
          }

          console.log(`remote task ${state.id} ${state.status} on node ${state.details.node}`);

          self.emit('task-end', state);
        }
      });

      this.node.on('mutate', (update) => {
        if (update.id in self._tasksLookup) {
          const state = self._tasksLookup[update.id];
          state.mutate(update);
          self.emit('mutate', state, update);
        }
      });

      this.node.on('node-connected', (clusterNode) => {
        self._nodes.push(clusterNode);
        self.emit('node-connected', clusterNode);
      });

      this.node.on('node-disconnected', (clusterNode) => {
        for (let i = 0; i < self._nodes.length; i++) {
          const existingNode = self._nodes[i];
          if (existingNode.id === clusterNode.id) {
            self._nodes.splice(i, 1);
            self.emit('node-disconnected', clusterNode);
          }
        }
      });
    }
  }

  start(details, callback) {
    /* eslint-disable no-param-reassign */
    if (!details.id) {
      // fix details to have an id, without modify the details object
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

  hasNodeWithId(id) {
    for (const node of this._nodes) {
      if (node.id === id) {
        return true;
      }
    }
    return false;
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
    const self = this;

    this.socket.on('connection', (nodeSocket) => {
      const node = self.addNode(nodeSocket.id || uuid(), new RemoteTaskManager(nodeSocket));

      // remove if needed.
      nodeSocket.on('disconnect', () => {
        node.detach();
      });
    });
  }

  addNode(id, manager) {
    const self = this;

    const node = {
      id,
      manager,
    };
    // aggregate all events
    node.manager.on('new-task', task => self.emit('new-task', task));
    node.manager.on('task-end', task => self.emit('task-end', task));
    node.manager.on('mutate', (task, update) => self.emit('mutate', task, update));
    node.manager.on('node-connected', clusterNode => self.emit('node-connected', clusterNode));
    node.manager.on('node-disconnected', clusterNode => self.emit('node-disconnected', clusterNode));

    // add detach method for future use
    node.detach = () => {
      self._nodes.splice(self._nodes.indexOf(node), 1);

      for (const nodeDetails of node.manager.nodes()) {
        self.emit('node-disconnected', nodeDetails);
      }
    };

    // push it to the nodes list.
    this._nodes.push(node);

    // notify when nodes are connected
    if (node.manager.nodes().length > 0) {
      for (const nodeDetails of node.manager.nodes()) {
        self.emit('node-connected', nodeDetails);
      }
    } else {
      node.manager.on('ready', () => {
        for (const nodeDetails of node.manager.nodes()) {
          self.emit('node-connected', nodeDetails);
        }
      });
    }

    return node;
  }

  start(details, callback) {
    if (details.node) {
      for (const node of this._nodes) {
        if (node.manager.hasNodeWithId(details.node)) {
          node.manager.start(details, callback);
        }
      }
    } else {
      this.nextNode = (this.nextNode + 1) % this._nodes.length;
      const node = this._nodes[this.nextNode];
      node.manager.start(details, callback);
    }
  }

  killTaskById(id) {
    for (const node of this._nodes) {
      if (node.manager.hasTaskWithId(id)) {
        node.manager.killTaskById(id);
        return;
      }
    }
  }

  hasTaskWithId(id) {
    for (const node of this._nodes) {
      if (node.manager.hasTaskWithId(id)) {
        return true;
      }
    }
    return false;
  }
  getTaskById(id) {
    for (const node of this._nodes) {
      if (node.manager.hasTaskWithId(id)) {
        return node.manager.getTaskById(id);
      }
    }
    return undefined;
  }

  hasNodeWithId(id) {
    for (const node of this._nodes) {
      if (node.manager.hasNodeWithId(id)) {
        return true;
      }
    }
    return false;
  }

  tasks() {
    return this._nodes.reduce((result, node) => result.concat(node.manager.tasks()), []);
  }

  nodes() {
    return this._nodes.reduce((result, node) => result.concat(node.manager.nodes()), []);
  }

  expose(io) {
    const self = this;
    io.on('connect', (socket) => {
      socket.emit('setup', {
        tasks: self.tasks(),
        nodes: self.nodes(),
      });

      socket.on('start-task', (details) => {
        self.start(details);
      });

      socket.on('kill-task', (id) => {
        self.killTaskById(id);
      });

      socket.on('disconnect', () => {
      });
    });

    self.on('new-task', (task) => {
      io.emit('new-task', task);
    });

    self.on('task-end', (task) => {
      // over the wire we only send the id
      io.emit('task-end', task.id);
    });

    self.on('mutate', (task, update) => {
      io.emit('mutate', update);
    });

    self.on('node-connected', (node) => {
      io.emit('node-connected', node);
    });

    self.on('node-disconnected', (node) => {
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
  ClusterTaskManager,
};
