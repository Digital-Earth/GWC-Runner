const fs = require('fs');
const path = require('path');
const parseArgs = require('minimist');
const { getHostIps } = require('./utils');

const options = parseArgs(process.argv);
const configPath = path.resolve(process.cwd(), options.config || './node.config.json');

// load node config
if (!fs.existsSync(configPath)) {
  console.error('Please setup node before run the node or specify node config location using "--config"');
  console.error('use: node ggs setup');
  process.exit(1);
}
const nodeConfig = JSON.parse(fs.readFileSync(configPath), 'utf8');

if (options.port) {
  console.log(`overwrite nodeConfig.port: ${nodeConfig.nodePort} -> ${options.port}`);
  nodeConfig.nodePort = +options.port;
}

// resolve IP on startup.
const ips = getHostIps();

if (nodeConfig.network in ips) {
  nodeConfig.ip = ips[nodeConfig.network];
} else {
  nodeConfig.ip = 'localhost';
}

// ensure directories exists
if (!fs.existsSync(nodeConfig.dataPath)) {
  fs.mkdirSync(nodeConfig.dataPath);
}

if (!fs.existsSync(nodeConfig.cachePath)) {
  fs.mkdirSync(nodeConfig.cachePath);
}

module.exports = nodeConfig;
