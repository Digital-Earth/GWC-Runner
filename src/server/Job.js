const clone = require('clone');
const extend = require('extend');
const uuid = require('uuid/v4');
const ee = require('event-emitter');
const {
  StatusCodes,
  MutableState,
} = require('./MutableState');

const serverContext = require('./ServerContext');

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
    // eslint-disable-next-line no-param-reassign
    options = extend({}, options);
    if (!options.while) {
      // eslint-disable-next-line no-param-reassign
      options.while = (() => true);
    }
    return this.invoke(task, options);
  }

  invoke(task, options) {
    if (task instanceof Job) {
      if (options && options.while) {
        throw "same Job instance can't be used with options.while for multiple iterations. please change into a factory function";
      }
      const self = this;
      return new PromiseAction(this.job, this.sync, (() => {
        task.parent = self.job;
        task.start();
        return task;
      }), options);
    } else if (typeof task === 'function') {
      return new PromiseAction(this.job, this.sync, task, options);
    }
    return new TaskAction(this.job, this.sync, task, options);
  }

  then(callback) {
    return new PromiseAction(this.job, this.sync, callback);
  }

  complete(value) {
    const forwardActionResult = arguments.length == 0;
    this.sync.on(result => this.job.complete(forwardActionResult ? result : value));
  }

  // nodes = '*' - all nodes
  //       = [id,id] - for specific nodes as an array
  //       = "id,id,id" - for specific nodes as a string
  // task - task details. can't invoke callback on remote nodes
  // options - task options
  forEachNode(nodes, task, options) {
    // eslint-disable-next-line no-param-reassign
    options = options || {};
    if (nodes === '*') {
      // eslint-disable-next-line no-param-reassign
      nodes = serverContext.cluster.nodes().map(node => node.id);
    } else if (!Array.isArray(nodes)) {
      // eslint-disable-next-line no-param-reassign
      nodes = nodes.split(',');
    }

    const action = new Action(this.job, this.sync);

    action.tasks = [];
    const results = [];
    let completed = 0;

    const self = this;

    this.then(() => {
      action.running = true;

      function invokeTaskOnNode(node) {
        const taskIndex = results.length;
        results.push(undefined);
        const nodeTask = clone(task);
        nodeTask.node = node;

        const invokedTask = self.invoke(nodeTask, options);

        action.tasks.push(invokedTask);
        invokedTask.then((result) => {
          results[taskIndex] = result;
          completed++;
          if (completed === nodes.length) {
            action.running = false;
            action.result = results;
            action.sync.trigger(results);
          }
        });
      }

      nodes.forEach(node => invokeTaskOnNode(node));
    });

    return action;
  }

  forEach(items, callback, options) {
    // eslint-disable-next-line no-param-reassign
    options = options || {};

    const parallel = options.parallel || 1;

    const action = new Action(this.job, this.sync);

    const self = this;

    const total = items.length;
    let index = 0;
    let completed = 0;

    action.tasks = [];
    const results = [];

    function startNextTask() {
      action.running = true;
      while (action.tasks.length < parallel && index < items.length) {
        const itemIndex = index;
        index++;

        const item = items[itemIndex];

        const itemAction = self.then(() => callback(item));

        action.tasks.push(itemAction);

        itemAction.then((result) => {
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

    // eslint-disable-next-line no-param-reassign
    options = options || {};
    this.while = options.while || (() => false);

    const self = this;

    function complete(value) {
      if (arguments.length > 0) {
        self.result = value;
      }
      if (self.while(value)) {
        // eslint-disable-next-line no-use-before-define
        doTask(value);
      } else {
        self.sync.trigger(value);
      }
    }

    function doTask(value) {
      const result = callback(value);

      if (result && result.sync) {
        self.running = true;

        // auto start a job
        // eslint-disable-next-line no-use-before-define
        if (result instanceof Job) {
          result.parent = self.job;
          result.start();
        }

        // wait until item completed
        result.sync.on((finalResult) => {
          self.running = false;
          complete(finalResult);
        });
      } else {
        complete(result);
      }
    }

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

    // eslint-disable-next-line no-param-reassign
    options = options || {};
    this.while = options.while || function () {
      return false;
    };

    this.publish = options.publish;

    const self = this;

    function killTask() {
      if (self.task) {
        serverContext.cluster.killTaskById(self.task.id);
      }
    }

    function startTask() {
      // add job id, we need to do it now because only here the jobParent might be known.
      self.details.details = self.details.details || {};
      const rootJob = self.job.getRootJob();

      self.details.details.job = rootJob.id;
      if (!self.details.env) {
        self.details.env = {};
      }
      self.details.env.GGS_JOB = rootJob.id;
      if (rootJob.state.state.config) {
        self.details.env.GGS_JOB_CONFIG = JSON.stringify(rootJob.state.state.config);
      }

      serverContext.cluster.start(self.details, (state) => {
        self.task = state;
        rootJob.state.mutateData('tasks', state.id);
        if (self.publish) {
          rootJob.state.mutateData(self.publish.name, self.publish.value);
        }
        self.emit('start');

        state.on('exit', () => {
          self.task = undefined;
          self.result = state;
          self.job.getRootJob().state.mutateDataDelete('tasks', state.id);
          if (self.publish) {
            rootJob.state.mutateDataDelete(self.publish.name, self.publish.value);
          }

          if (self.job.status === StatusCodes.cancelled) {
            self.emit('cancelled');
            self.running = false;
            self.sync.trigger(self.result);
            return;
          }
          self.emit('done');


          if (self.while(self.result)) {
            startTask();
          } else {
            self.running = false;
            self.sync.trigger(self.result);
          }
        });

        if (self.job.status !== StatusCodes.running) {
          killTask();
        }
      });
    }

    this.trigger.on(() => {
      if (self.job.status === StatusCodes.cancelled) {
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
  constructor(name, id = undefined) {
    this.parent = null;
    this.id = id || uuid();
    this.name = name || this.id;

    this.state = new MutableState({
      id: this.id,
      name: this.name,
      status: StatusCodes.new,
    });

    // start point
    this.root = new Action(this, null);

    // complete point
    this.sync = new SyncPoint();
  }

  get status() {
    return this.state.status;
  }

  set status(value) {
    this.state.mutateStatus(value);
  }

  getRootJob() {
    if (this.parent) {
      return this.parent.getRootJob();
    }
    return this;
  }

  start() {
    if (this.status === StatusCodes.new || this.status === StatusCodes.stopped) {
      this.status = StatusCodes.running;
      this.emit('start');
      this.root.sync.trigger();
    }
  }

  kill() {
    if (this.status === StatusCodes.new ||
      this.status === StatusCodes.running ||
      this.status === StatusCodes.stopped) {
      this.status = StatusCodes.cancelled;
      this.emit('cancelled');
      this.root.sync.trigger();
    }
  }

  complete(value) {
    if (this.status === StatusCodes.new || this.status === StatusCodes.running) {
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
    return this.root.invoke(task, options);
  }

  forEach(items, callback, options) {
    return this.root.forEach(items, callback, options);
  }

  forEachNode(nodes, task, options) {
    return this.root.forEachNode(nodes, task, options);
  }

  whenAll(...actions) {
    let count = 0;
    const action = new Action(this, this.root.sync);
    action.actions = actions;

    function onActionDone() {
      count++;
      if (count === actions.length) {
        action.result = actions.map(aa => aa.result);
        action.sync.trigger(action.result);
      }
    }

    for (const a of actions) {
      a.sync.on(onActionDone);
    }

    return action;
  }

  whenFirst(...actions) {
    const action = new Action(this, this.root.sync);
    action.actions = actions;

    for (const a of actions) {
      a.sync.on((result) => {
        // TODO: not overwrite the action result when second task is been called
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
 * job	.invoke({cleanup, node: id}) //to invoke cleanup job on a specific node
 * 		.invoke({cleanup, node: '*'}) //to invoke cleanup job on all nodes
 *
 * TODO:
 * job = new Job("lb");
 *
 * action = job.keepAlive({lb}, {instancePerNode:1});
 *
 * //publish a value while task is running can be done using the publish
 * for (number of servers) {
 * 		job	.keepAlive({gwc}, {'publish':{'name':server','value':number}});
 * }
 *
 * //this will allow you to query which tasks are running
 * job.state.data['server'] = [1,2,3]
 *
 * options:
 *    instances: number
 *    instancesPerNode: number
 *    nodes: { filters }
 *    name: set as named actions
 *    while: function for rerunning
 */


module.exports = Job;
