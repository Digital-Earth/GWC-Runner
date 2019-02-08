const nodeConfig = require('../nodeConfig');
const { listLocalDeployments } = require('../utils');

module.exports = () => {
  if (process.argv[2] !== 'local') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  const deployments = listLocalDeployments(nodeConfig);

  for (const deployment of deployments) {
    console.log(`*** PUSH *** deployments=${JSON.stringify(deployment)}`);
    console.log(deployment.name, deployment.version);
  }
};
