const path = require('path');
const fs = require('fs');
const os = require('os');

function ensureDirectoryExists(directory) {
  if (fs.existsSync(directory)) {
    return;
  }
  const parent = path.dirname(directory);
  ensureDirectoryExists(parent);
  fs.mkdirSync(directory);
}

function getHostIps() {
  const ips = {};

  const netFaces = os.networkInterfaces();
  for (const name in netFaces) {
    for (const networkAddress of netFaces[name]) {
      if (networkAddress.family === 'IPv4' && !networkAddress.internal) {
        ips[name] = networkAddress.address;
      }
    }
  }
  return ips;
}

const deploymentsCache = {};

function getDeploymentDetails(deployment, nodeConfig) {
  if (!nodeConfig) {
    throw new Error('please attach nodeConfig before calling getDeploymentDetails');
  }

  const key = `${deployment.name}.${deployment.version}`;

  if (key in deploymentsCache) {
    return deploymentsCache[key];
  }

  const deploymentPath = path.join(nodeConfig.deployments, key);
  const deploymentFile = `${deploymentPath}.json`;

  if (!fs.existsSync(deploymentPath) || !fs.existsSync(deploymentFile)) {
    return undefined;
  }

  const deploymentDetails = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

  deploymentDetails.root = deploymentPath;
  deploymentsCache[key] = deploymentDetails;
  return deploymentDetails;
}

module.exports = {
  ensureDirectoryExists,
  getHostIps,
  getDeploymentDetails,
};

