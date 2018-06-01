const path = require('path');
const fs = require('fs');
const clone = require('clone');
const extend = require('extend');
const es6template = require('es6-template');

class TaskResolver {
  constructor(nodeConfig) {
    this.nodeConfig = nodeConfig;
    this.deploymentsCache = {};
  }

  getDeploymentDetails(deployment) {
    const key = `${deployment.name}.${deployment.version}`;

    if (key in this.deploymentsCache) {
      return this.deploymentsCache[key];
    }

    const deploymentPath = path.join(this.nodeConfig.deployments, key);
    const deploymentFile = `${deploymentPath}.json`;

    if (!fs.existsSync(deploymentPath) || !fs.existsSync(deploymentFile)) {
      return undefined;
    }

    const deploymentDetails = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

    deploymentDetails.root = deploymentPath;
    this.deploymentsCache[key] = deploymentDetails;
    return deploymentDetails;
  }

  resolveDetails(taskDetails, callback) {
    // clone details
    const newDetails = clone(taskDetails);

    // setup logs
    function ensureDirectoryExists(directory) {
      if (fs.existsSync(directory)) {
        return;
      }
      const parent = path.dirname(directory);
      ensureDirectoryExists(parent);
      fs.mkdirSync(directory);
    }

    const logPath = path.join(this.nodeConfig.cachePath, 'logs');
    ensureDirectoryExists(logPath);

    // eslint-disable-next-line no-template-curly-in-string
    newDetails.logFile = path.join(logPath, 'log.${time}.${name}.${id}.txt');

    // add some global env variables from node setup
    if (!('env' in newDetails)) {
      newDetails.env = {};
    }
    newDetails.env.GGS_CLUSTER_MASTER = this.nodeConfig.master;
    newDetails.env.GGS_DEPLOYMENTS = this.nodeConfig.deployments;
    newDetails.env.GGS_DATA = this.nodeConfig.dataPath;
    newDetails.env.GGS_CACHE = this.nodeConfig.cachePath;
    newDetails.env.GGS_LOGS = logPath;

    let variables = extend({}, this.nodeConfig, newDetails.details);

    // resolve path from deployment
    if (newDetails.service && newDetails.deployment) {
      const deployment = this.getDeploymentDetails(newDetails.deployment);

      if (deployment) {
        variables = extend({}, deployment.variables, variables);

        // resolve arguments from deployment
        if (newDetails.service in deployment.services) {
          const serviceDetails = deployment.services[newDetails.service];
          const productDetails = deployment.services[serviceDetails.product];

          const servicePath = path.join(deployment.root, serviceDetails.product);
          newDetails.cwd = servicePath;

          const exec = path.resolve(servicePath, es6template(serviceDetails.exec, variables));
          newDetails.exec = exec;

          if (serviceDetails.args) {
            newDetails.args = [].concat(serviceDetails.args, newDetails.args || []);
          }

          if (serviceDetails.env) {
            newDetails.env = extend({}, serviceDetails.env, newDetails.env);
          }

          // overwrite log name with more detailed information
          newDetails.logFile = path.join(logPath, `log.\${time}.${productDetails.product}.${productDetails.version}.\${id}.txt`);
        }
      }
    }

    // eval all the arguments on the details
    if (newDetails.cwd) {
      newDetails.cwd = es6template(newDetails.cwd, variables);
    }

    if (newDetails.exec) {
      newDetails.exec = es6template(newDetails.exec, variables);
    }

    if (newDetails.args) {
      newDetails.args = newDetails.args.map(arg => es6template(arg, variables));
    }

    if (newDetails.env) {
      for (const variable in newDetails.env) {
        newDetails.env[variable] = es6template(newDetails.env[variable], variables);
      }
    }

    callback(null, newDetails);
  }
}

module.exports = TaskResolver;
