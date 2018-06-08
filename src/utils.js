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

  ips.localhost = 'localhost';
  ips.all = '*';

  return ips;
}

const deploymentsCache = {};

function listLocalDeployments(nodeConfig) {
  const deployments = [];
  const jsonFiles = fs.readdirSync(process.env.GGS_DEPLOYMENTS || nodeConfig.deployments).filter(entry => entry.endsWith('.json'));

  for (const file of jsonFiles) {
    const firstDot = file.indexOf('.');
    const name = file.substr(0, firstDot);
    const version = file.substr(firstDot + 1).replace('.json', '');
    deployments.push({ name, version });
  }

  // adding local development details
  if (nodeConfig.dev && Array.isArray(nodeConfig.deployments)) {
    for (const deployment of nodeConfig.deployments) {
      deployments.push({ name: deployment.name, version: deployment.version });
    }
  }

  return deployments;
}

function findDevDeployment(deployment, nodeConfig) {
  if (nodeConfig.dev && Array.isArray(nodeConfig.deployments)) {
    for (const dev of nodeConfig.deployments) {
      if (dev.name === deployment.name && dev.version === deployment.version) {
        return dev;
      }
    }
  }
  return undefined;
}

function getDeploymentDetails(deployment, nodeConfig) {
  if (!nodeConfig) {
    throw new Error('please attach nodeConfig before calling getDeploymentDetails');
  }

  const key = `${deployment.name}.${deployment.version}`;

  if (!(key in deploymentsCache)) {
    const devDeployment = findDevDeployment(deployment);

    if (devDeployment) {
      const deploymentDetails = JSON.parse(fs.readFileSync(devDeployment.path, 'utf8'));
      deploymentsCache[key] = deploymentDetails;
    } else {
      const deploymentPath = path.join(nodeConfig.deployments, key);
      const deploymentFile = `${deploymentPath}.json`;

      if (!fs.existsSync(deploymentPath) || !fs.existsSync(deploymentFile)) {
        return undefined;
      }

      const deploymentDetails = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      deploymentDetails.root = deploymentPath;
      deploymentsCache[key] = deploymentDetails;
    }
  }

  return deploymentsCache[key];
}

module.exports = {
  ensureDirectoryExists,
  getHostIps,
  listLocalDeployments,
  getDeploymentDetails,
};

