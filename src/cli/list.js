const parseArgs = require('minimist');
const Repo = require('../server/Repo');
const config = require('../server/config');
// const nodeConfig = require('../nodeConfig');

module.exports = () => {
  if (process.argv[2] !== 'list') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  const options = parseArgs(process.argv.slice(3));

  const repo = new Repo(config.repo);

  repo.list(options.p || options.d, (error, result) => {
    if (error) {
      console.log(error);
      return;
    }
    for (const entry of result) {
      console.log(entry.product, entry.version);
    }
  });
};
