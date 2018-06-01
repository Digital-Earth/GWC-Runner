const http = require('http');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./server/config');

const parseArgs = require('minimist');
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
const api = require('./server/api');

api.attach(server, app);

if (config.production) {
  api.startGwc();
}

const PORT = process.env.PORT || 8080;

server.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`live and running at ${PORT}`);
  }
});
