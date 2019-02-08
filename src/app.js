const http = require('http');
const express = require('express');
const parseArgs = require('minimist');

const config = require('./server/config');
const serverContext = require('./server/ServerContext');

const options = parseArgs(process.argv);

const PORT = options.port || process.env.PORT || 8080;

const nodeConfig = require('./nodeConfig');

if (options.local) {
  nodeConfig.nodePort = +PORT;
  if (nodeConfig.ip !== '*') {
    nodeConfig.master = `http://${nodeConfig.ip}:${PORT}`;
  } else {
    nodeConfig.master = `http://localhost:${PORT}`;
  }
}

console.log(nodeConfig);
serverContext.nodeConfig = nodeConfig;


const app = express();

if (process.env.NODE_ENV === 'production') {
  // upgrade config to production
  // var config = require('./server/config.production');

  config.production = true;

  console.log(config);

  // You probably have other paths here
  app.use(express.static('dist'));
} else {
  /* eslint-disable global-require, import/no-extraneous-dependencies */


  const webpack = require('webpack');
  const webpackConfig = require('../webpack.config');
  const compiler = webpack(webpackConfig);

  // Create the app, setup the webpack middleware

  app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
  }));
  app.use(require('webpack-hot-middleware')(compiler));

  // app.get('/', function(req, res) {
  // 	res.sendFile(path.join(__dirname, '/src/index.html'));
  // });
}

const server = new http.Server(app);

// install socket.io api
const api = require('./server/ui.api');

api.attach(server, app);

if (config.production || options.autorun) {
  api.startDeployment();
}

server.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`live and running at ${PORT}`);
  }
});
