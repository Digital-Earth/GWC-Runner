const debounce = require('debounce');
const serverContext = require('./ServerContext');
const config = require('./config');
const parseArgs = require('minimist');

const { ClusterTaskManager, RemoteTaskManager, LocalTaskManager } = require('./TaskManager');
const TaskResolver = require('./TaskResolver');


const Api = {};

Api.attachNodesNamespace = (io, options) => {
  /* eslint-disable no-param-reassign */
  options = options || {};
  serverContext.api = Api;
  serverContext.config = config;
  serverContext.cluster = new ClusterTaskManager(io);

  if (options.cluster) {
    /* eslint-disable global-require */
    const socketClient = require('socket.io-client');
    const cluster = socketClient(`${options.cluster}/cluster`);
    serverContext.cluster.addNode('cluster', new RemoteTaskManager(cluster));
  }

  if (options.local) {
    const taskResolver = new TaskResolver(serverContext.nodeConfig);
    const localConfig = {
      resolveDetails: (details, callback) => taskResolver.resolveDetails(details, callback),
      info: {
        name: `${serverContext.nodeConfig.ip}:${serverContext.nodeConfig.nodePort}`,
        version: config.version,
        config: serverContext.nodeConfig,
      },
    };
    serverContext.cluster.addNode('local', new LocalTaskManager(null, localConfig));
  }

  if (options.trace) {
    serverContext.cluster.on('new-task', task => console.log('new-task', task));
    serverContext.cluster.on('kill-task', task => console.log('kill-task', task));
    serverContext.cluster.on('task-end', task => console.log('task-end', task));
  }

  serverContext.completedTasks = {};
  function addCompletedTasks(task) {
    serverContext.completedTasks[task.id] = task;
    const timeToKeepInDictionary = 5 * 60 * 1000;
    setTimeout(() => {
      delete serverContext.completedTasks[task.id];
    }, timeToKeepInDictionary);
  }
  serverContext.cluster.on('task-end', addCompletedTasks);

  serverContext.cluster.on('node-connected', node => console.log('node-connected', node.id, `${node.config.ip}:${node.config.nodePort}`));
  serverContext.cluster.on('node-disconnected', node => console.log('node-disconnected', node.id, `${node.config.ip}:${node.config.nodePort}`));
};

Api.attachRestAPI = (app) => {
  // rest API
  app.get('/_cluster/nodes', (req, res) => {
    res.send(JSON.stringify(serverContext.cluster.nodes()));
    res.end();
  });

  app.get('/_cluster/tasks', (req, res) => {
    res.send(JSON.stringify(serverContext.cluster.tasks()));
    res.end();
  });

  app.get('/_cluster/tasks/:taskId', (req, res) => {
    let task;
    if (req.params.taskId in serverContext.completedTasks) {
      task = serverContext.completedTasks[req.params.taskId];
    } else {
      task = serverContext.cluster.getTaskById(req.params.taskId);
    }
    if (task == null) {
      res.status(404);
      res.send(`Task ${req.params.taskId} not found`);
      res.end();
    } else {
      res.send(JSON.stringify({
        id: task.id,
        name: task.name,
        status: task.status,
        endpoints: task.endpoints,
        details: task.details,
        state: task.state,
        log: task.log,
        data: task.data,
      }));
    }
  });

  app.get('/_cluster/endpoints', (req, res) => {
    const endpoints = serverContext.cluster.tasks()
      .filter(task => Object.keys(task.endpoints).length > 0)
      .map(task => ({ endpoints: task.endpoints, details: task.details, state: task.state }));
    res.send(JSON.stringify(endpoints));
    res.end();
  });

  app.get('/_cluster/endpoints/:service/:endpoint', (req, res) => {
    const endpoints = [];
    if (req.params.service === 'master' && req.params.endpoint === '_cluster') {
      endpoints.push(serverContext.nodeConfig.master);
    } else {
      serverContext.cluster.tasks()
        .filter(task =>
          (req.params.endpoint in task.endpoints) &&
          task.details.service === req.params.service)
        .forEach(task => endpoints.push(task.endpoints[req.params.endpoint]));
    }
    res.send(JSON.stringify(endpoints));
    res.end();
  });
};

Api.attachEndpointsNamespace = (io) => {
  let currentEndpoints = {};

  function buildEndpoints() {
    const endpoints = {};

    // collect new endpoints
    for (const task of serverContext.cluster.tasks()) {
      const names = Object.keys(task.endpoints);
      if (names.length > 0) {
        const service = task.details.service || task.state.type;
        if (!(service in endpoints)) {
          endpoints[service] = {};
        }

        const serviceEndpoints = endpoints[service];

        for (const name of names) {
          if (!(name in serviceEndpoints)) {
            serviceEndpoints[name] = [];
          }
          serviceEndpoints[name].push(task.endpoints[name]);
        }
      }
    }

    // sort endpoints
    for (const service in endpoints) {
      for (const name in endpoints[service]) {
        endpoints[service][name].sort();
      }
    }

    // add master endpoint
    endpoints.master = { _cluster: [serverContext.nodeConfig.master] };

    return endpoints;
  }

  function findChanges(newEndpoints, oldEndpoints) {
    const services = Object.keys(newEndpoints).concat(Object.keys(oldEndpoints));
    const changes = {};

    for (const service of services) {
      if (service in newEndpoints) {
        // service found in new endpoints
        if (service in oldEndpoints) {
          // and also in the old endpoint, check if there was a change
          if (JSON.stringify(newEndpoints[service]) !== JSON.stringify(oldEndpoints[service])) {
            changes[service] = newEndpoints[service];
          }
        } else {
          // this is a new service
          changes[service] = newEndpoints[service];
        }
      } else if (service in oldEndpoints) {
        // remove all information about this service
        changes[service] = {};
      }
    }

    return changes;
  }


  let emitNewEndpoints = () => {
    const newEndpoints = buildEndpoints();
    const changes = findChanges(newEndpoints, currentEndpoints);
    console.log(changes);
    currentEndpoints = newEndpoints;
    io.emit('endpoints', changes);
  };

  emitNewEndpoints = debounce(emitNewEndpoints, 500);

  io.on('connect', (client) => {
    console.log('endpoint connected', currentEndpoints);
    client.emit('endpoints', currentEndpoints);
  });

  serverContext.cluster.on('mutate', (task, mutate) => {
    if (mutate.type === 'endpoints' || mutate.type === 'status') {
      emitNewEndpoints();
    }
  });
};

Api.attach = (server, app) => {
  /* eslint-disable global-require */
  console.log('setup socket.io API');

  const io = require('socket.io')(server);

  Api.attachNodesNamespace(io.of('/node'), parseArgs(process.argv));
  serverContext.cluster.expose(io.of('/cluster'));
  Api.attachEndpointsNamespace(io.of('/endpoint'));

  Api.attachRestAPI(app);

  return io;
};


module.exports = Api;
