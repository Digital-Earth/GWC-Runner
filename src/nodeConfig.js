const fs = require('fs');

// load node config
if (!fs.existsSync('./node.config.json')) {
  console.error('Please setup node before run the node');
  console.error('use: node ggs setup');
  process.exit(1);
}
const nodeConfig = require('../node.config.json');

module.exports = nodeConfig;
