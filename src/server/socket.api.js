const serverContext = require('./ServerContext');
const config = require('./config');
const parseArgs = require('minimist');

const { ClusterTaskManager, LocalTaskManager } = require('./TaskManager');
const TaskResolver = require('./TaskResolver');


const Api = {};

Api.attachNodesNamespace = (io, options) => {
  /* eslint-disable no-param-reassign */
  options = options || {};
  serverContext.api = Api;
  serverContext.config = config;
  serverContext.cluster = new ClusterTaskManager(io);
  if (options.local) {
    const taskResolver = new TaskResolver(serverContext.nodeConfig);
    const localConfig = {
      resolveDetails: (details, callback) => taskResolver.resolveDetails(details, callback),
      info: {
        name: `${serverContext.nodeConfig.ip}:${serverContext.nodeConfig.nodePort}`,
        config: serverContext.nodeConfig,
      },
    };
    serverContext.cluster.addNode('local', new LocalTaskManager(null, localConfig));
  }

  if (options.trace) {
    serverContext.cluster.on('new-task', task => console.log('new-task', task));
    serverContext.cluster.on('kill-task', task => console.log('kill-task', task));
    serverContext.cluster.on('task-end', task => console.log('task-end', task));

    serverContext.cluster.on('node-connected', node => console.log('node-connected', node));
    serverContext.cluster.on('node-disconnected', node => console.log('node-disconnected', node));
  } else {
    serverContext.cluster.on('node-connected', node => console.log('node-connected', node.id, `${node.config.ip}:${node.config.nodePort}`));
    serverContext.cluster.on('node-disconnected', node => console.log('node-disconnected', node.id, `${node.config.ip}:${node.config.nodePort}`));
  }
};

Api.attachRestAPI = (app) => {
  // rest API
  app.get('/nodes', (req, res) => {
    res.send(JSON.stringify(serverContext.cluster.nodes()));
    res.end();
  });

  app.get('/tasks', (req, res) => {
    res.send(JSON.stringify(serverContext.cluster.tasks()));
    res.end();
  });

  app.get('/endpoints', (req, res) => {
    const endpoints = serverContext.cluster.tasks()
      .filter(task => Object.keys(task.endpoints).length > 0)
      .map(task => ({ endpoints: task.endpoints, details: task.details, state: task.state }));
    res.send(JSON.stringify(endpoints));
    res.end();
  });
};

Api.attach = (server, app) => {
  /* eslint-disable global-require */
  console.log('setup socket.io API');

  const io = require('socket.io')(server);

  Api.attachNodesNamespace(io.of('/node'), parseArgs(process.argv));
  serverContext.cluster.expose(io.of('/cluster'));

  Api.attachRestAPI(app);
};


module.exports = Api;
