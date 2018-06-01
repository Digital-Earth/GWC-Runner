const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const getPort = require('get-port');
const io = require('socket.io-client');
const parseArgs = require('minimist');

const { LocalTaskManager } = require('./server/TaskManager');
const TaskResolver = require('./server/TaskResolver');
const serverContext = require('./server/ServerContext');

const options = parseArgs(process.argv);

const nodeConfigLocation = options.config || './node.config.json';

// load node config
if (!fs.existsSync(nodeConfigLocation)) {
  console.error(`can't find node config: ${nodeConfigLocation}`);
  console.error('Please setup node before run the node or specify node config location using "--config"');
  console.error('use: node ggs setup');
  process.exit(1);
}
const nodeConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), nodeConfigLocation), 'utf8'));

if (options.port) {
  console.log(`overwrite nodeConfig.port: ${nodeConfig.port} -> ${options.port}`);
  nodeConfig.nodePort = +options.port;
}

console.log(nodeConfig);
serverContext.nodeConfig = nodeConfig;

// start server
const app = express();

const server = new http.Server(app);

if (nodeConfig.type === 'master') {
  /* eslint-disable global-require */
  // install socket.io api
  const api = require('./server/socket.api');
  api.attach(server, app);
} else {
  const { master } = nodeConfig;
  console.log(`master: ${master}`);
  const masterClient = io(`${master}/node`);

  const taskResolver = new TaskResolver(nodeConfig);
  const localConfig = {
    resolveDetails: (details, callback) => taskResolver.resolveDetails(details, callback),
    info: {
      name: `${serverContext.nodeConfig.ip}:${serverContext.nodeConfig.nodePort}`,
      config: serverContext.nodeConfig,
    },
  };

  server.taskManager = new LocalTaskManager(masterClient, localConfig);

  masterClient.on('connect', () => {
    console.log('connected to master', master);
  });

  masterClient.on('disconnect', () => {
    console.log('disconnected from master', master);
  });
}

const PORT = nodeConfig.nodePort || process.env.PORT || 8081;
getPort({ port: PORT }).then((port) => {
  server.listen(port, (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`cluster node '${nodeConfig.hostname}' (${nodeConfig.type}) is running at ${port}`);
    }
  });
});
