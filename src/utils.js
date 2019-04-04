const path = require('path');
const fs = require('fs');
const os = require('os');
const clone = require('clone');

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
  if (nodeConfig.dev && Array.isArray(nodeConfig.dev.deployments)) {
    for (const dev of nodeConfig.dev.deployments) {
      if (dev.name === deployment.name && dev.version === deployment.version) {
        return dev;
      }
    }
  }
  return undefined;
}

function mergeDeployment(...deployments) {
  const keys = ['variables', 'products', 'services'];
  const result = {
    variables: {},
    products: {},
    services: {},
  };
  for (const deployment of deployments) {
    if (deployment) {
      for (const key of keys) {
        if (key in deployment) {
          Object.assign(result[key], clone(deployment[key]));
        }
      }
    }
  }

  return result;
}

function getDeploymentDetails(deployment, nodeConfig) {
  if (!nodeConfig) {
    throw new Error('please create nodeConfig before calling getDeploymentDetails');
  }

  const key = `${deployment.name}.${deployment.version}`;

  if (!(key in deploymentsCache)) {
    const devDeployment = findDevDeployment(deployment, nodeConfig);

    if (devDeployment) {
      const deploymentDetails = JSON.parse(fs.readFileSync(devDeployment.path, 'utf8'));
      deploymentsCache[key] = deploymentDetails;
    } else {
      const deploymentPath = path.join(nodeConfig.deployments, key);
      const deploymentFile = `${deploymentPath}.json`;

      if (!fs.existsSync(deploymentPath) || !fs.existsSync(deploymentFile)) {
        return undefined;
      }

      let deploymentDetails = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

      if (nodeConfig.override) {
        deploymentDetails = mergeDeployment(deploymentDetails, nodeConfig.override);
      }

      deploymentDetails.root = deploymentPath;
      deploymentsCache[key] = deploymentDetails;

      console.log(JSON.stringify(deploymentDetails, null, 2));
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

