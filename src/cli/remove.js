const parseArgs = require('minimist');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const nodeConfig = require('../nodeConfig');

module.exports = () => {
  if (process.argv[2] !== 'remove') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  const options = parseArgs(process.argv.slice(3));
  if (!options.d || !options.v) {
    console.log('usage: node ggs.js clean -d=cluster -v=1.2.3');
  } else {
    const deploymentPath = path.join(process.env.GGS_DEPLOYMENTS || nodeConfig.deployments, `${options.d}.${options.v}`);

    console.log(`deleting deployment from ${deploymentPath}`);
    rimraf(deploymentPath, () => {
      fs.unlinkSync(`${deploymentPath}.json`);
      console.log('deployment been removed');
    });
  }
};
