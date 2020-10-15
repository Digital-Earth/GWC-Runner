const os = require('os');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const beautify = require('json-beautify');
const exec = require('await-exec');
const { getHostIps } = require('../utils');
const parseArgs = require('minimist');


async function generateDefaults() {
  const hostname = os.hostname();
  const mem = Math.round((os.totalmem() / 1024 / 1024 / 1024));
  const cpus = os.cpus().length;

  const rootPath = path.parse(process.cwd()).root;

  const defaults = {
    hostname,
    mem,
    cpus,
    rootPath: process.cwd(),
    nodePath: (await exec('where node')).stdout.trim(),
    deployments: `${rootPath}GGS\\deployments`,
    dataPath: `${rootPath}GGS\\gallery`,
    cachePath: `${rootPath}GGS\\cache`,
    network: 'all',
    nodePort: 8080,
    type: 'node',
  };

  return defaults;
}

const setup = async () => {
  const defaults = await generateDefaults();

  const ipsByName = getHostIps();
  const networks = [];
  for (const name in ipsByName) {
    const network = { name: `${ipsByName[name]} (${name})`, value: name };
    if (name === 'localhost') {
      networks.unshift(network);
    } else {
      networks.push(network);
    }
  }

  const config = await inquirer.prompt([
    {
      name: 'hostname',
      default: defaults.hostname,
      type: 'input',
      message: 'Host name',
    }, {
      name: 'mem',
      default: defaults.mem,
      type: 'input',
      message: 'Memory (GB)',
    }, {
      name: 'cpus',
      default: defaults.cpus,
      type: 'input',
      message: 'Number of CPUS',
    }, {
      name: 'rootPath',
      default: defaults.rootPath,
      type: 'input',
      message: 'root path',
    }, {
      name: 'nodePath',
      default: defaults.nodePath,
      type: 'input',
      message: 'NodeJS path',
    }, {
      name: 'deployments',
      default: defaults.deployments,
      type: 'input',
      message: 'Deployment path',
    }, {
      name: 'dataPath',
      default: defaults.dataPath,
      type: 'input',
      message: 'Data path (raw files)',
    }, {
      name: 'cachePath',
      default: defaults.cachePath,
      type: 'input',
      message: 'cache path (tiles storage)',
    }, {
      name: 'network',
      default: defaults.network,
      type: 'list',
      choices: networks,
      message: 'Network',
    }, {
      name: 'nodePort',
      default: defaults.nodePort,
      type: 'input',
      message: 'Node controller port',
    }, {
      name: 'type',
      default: defaults.type,
      type: 'list',
      choices: ['node', 'master'],
      message: 'Node controller port',
    }, {
      name: 'master',
      when: state => state.type !== 'master',
      default(state) {
        return `http://${ipsByName[state.network]}:${state.nodePort + 1}`;
      },
      type: 'input',
      message: 'Master port',
    }]);

  console.log(config);

  if (!fs.existsSync(config.dataPath)) {
    fs.mkdirSync(config.dataPath);
  }

  if (!fs.existsSync(config.cachePath)) {
    fs.mkdirSync(config.cachePath);
  }

  fs.writeFileSync('node.config.json', beautify(config, null, 2, 50));
};

module.exports = () => {
  const subCommand = process.argv[3];

  switch (subCommand) {
    case 'show':
      {
        // eslint-disable-next-line global-require
        const nodeConfig = require('../nodeConfig');
        console.log(beautify(nodeConfig, null, 2, 50));
      }
      break;

    case 'set':
    case 'unset':
      {
        // eslint-disable-next-line global-require
        const nodeConfig = require('../nodeConfig');
        const options = parseArgs(process.argv.slice(4));
        for (const variable in options) {
          if (variable !== '_') {
            nodeConfig.override = nodeConfig.override || {};
            nodeConfig.override.variables = nodeConfig.override.variables || {};
            if (subCommand === 'set') {
              nodeConfig.override.variables[variable] = options[variable];
            } else {
              delete nodeConfig.override.variables[variable];
            }
          }
        }
        fs.writeFileSync('node.config.json', beautify(nodeConfig, null, 2, 50));
        console.log(beautify(nodeConfig.override.variables, null, 2, 50));
      }
      break;

    case 'default':
      generateDefaults().then((nodeConfig) => {
        fs.writeFileSync('node.config.json', beautify(nodeConfig, null, 2, 50));
      });
      break;

    default:
      setup().catch((err) => {
        console.log(err);
        process.exit(1);
      });
      break;
  }
};
