const os = require('os');
const fs = require('fs');
const inquirer = require('inquirer');
const beautify = require('json-beautify');
const exec = require('await-exec');

const hostname = os.hostname();
const mem = Math.round((os.totalmem() / 1024 / 1024 / 1024));
const cpus = os.cpus().length;
const ips = [];
{
  const netFaces = os.networkInterfaces();
  for (const name in netFaces) {
    for (const networkAddress of netFaces[name]) {
      if (networkAddress.family === 'IPv4' && !networkAddress.internal) {
        ips.push({ name: `${networkAddress.address} (${name})`, value: networkAddress.address });
      }
    }
  }
}

const defaults = {
  hostname,
  mem,
  cpus,
  ip: ips[0],
  type: 'node',
  nodePort: 4000,
  deployments: 'c:\\GGS\\deployments',
  dataPath: 'c:\\GGS\\data',
  cachePath: 'c:\\GGS\\cache',
  nodePath: '',
  rootPath: process.cwd(),
};

const setup = async () => {
  defaults.nodePath = (await exec('where node')).stdout.trim();

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
      name: 'ip',
      default: defaults.ip,
      type: 'list',
      choices: ips,
      message: 'IP Address',
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
        return `http://${state.ip}:${state.nodePort + 1}`;
      },
      type: 'input',
      message: 'Master port',
    }]);

  console.log(config);

  fs.writeFileSync('node.config.json', beautify(config, null, 2, 50));
};

module.exports = () => {
  setup().catch((err) => {
    console.log(err);
    process.exit(1);
  });
};
