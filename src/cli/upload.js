const parseArgs = require('minimist');
const Repo = require('../server/Repo');
const config = require('../server/config');
const nodeConfig = require('../nodeConfig');

module.exports = () => {
  if (process.argv[2] !== 'upload') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  const options = parseArgs(process.argv.slice(3));

  if (nodeConfig.dev && nodeConfig.dev.products && options._.length === 0) {
    if (options.p in nodeConfig.dev.products) {
      options._.push(nodeConfig.dev.products[options.p]);
    }
    if (options.d in nodeConfig.dev.products) {
      options._.push(nodeConfig.dev.products[options.d]);
    }
  }

  if ((!options.p && !options.d) || options._.length !== 1) {
    console.log('usage: node ggs.js upload [-p=gwc|-d=cluster] [-v=1.2.3] folder');
    return;
  }

  const repo = new Repo(config.repo);

  if (options.d) {
    repo.uploadDeployment(options.d, options.v, options._[0], (error, result) => {
      if (error) {
        console.log(error);
      } else {
        console.log(result);
      }
    });
  } else {
    repo.upload(options.p, options.v, options._[0], (error, result) => {
      if (error) {
        console.log(error);
      } else {
        console.log(result);
      }
    });
  }
};
