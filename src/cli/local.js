const fs = require('fs');
const nodeConfig = require('../nodeConfig');

module.exports = () => {
  if (process.argv[2] !== 'local') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  const jsonFiles = fs.readdirSync(process.env.GGS_DEPLOYMENTS || nodeConfig.deployments).filter(entry => entry.endsWith('.json'));

  for (const file of jsonFiles) {
    const firstDot = file.indexOf('.');
    const name = file.substr(0, firstDot);
    const version = file.substr(firstDot + 1).replace('.json', '');
    console.log(`*** PUSH *** deployments=${JSON.stringify({ name, version })}`);
    console.log(name, version);
  }
};
