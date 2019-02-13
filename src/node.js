const http = require('http');
const express = require('express');
const getPort = require('get-port');
const io = require('socket.io-client');

const {
  LocalTaskManager
} = require('./server/TaskManager');
const TaskResolver = require('./server/TaskResolver');
const serverContext = require('./server/ServerContext');

const nodeConfig = require('./nodeConfig');

console.log(nodeConfig);
serverContext.nodeConfig = nodeConfig;

// start server
const app = express();

const server = new http.Server(app);

const PORT = nodeConfig.nodePort || process.env.PORT || 8081;
getPort({
  port: PORT
}).then((port) => {
  //overwrite port details for now
  nodeConfig.nodePort = port;

  if (nodeConfig.type === 'master') {
    /* eslint-disable global-require */
    // install socket.io api
    const api = require('./server/socket.api');
    api.attach(server, app);
  } else {
    const {
      master
    } = nodeConfig;
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

  server.listen(port, (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`cluster node '${nodeConfig.hostname}' (${nodeConfig.type}) is running at ${port}`);
    }
  });
});