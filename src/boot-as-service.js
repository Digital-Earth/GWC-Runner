const rootDir = process.env.GGS_ROOT;

console.log(process.env);

if (rootDir) {
  process.chdir(rootDir);
}

if (process.env.GGS_UI) {
  /* eslint-disable global-require */

  process.argv.push('--local');
  process.argv.push('--autorun');

  require('./app');
} else {
  /* eslint-disable global-require */
  require('./node');
}
