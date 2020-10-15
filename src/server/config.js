const pck = require('../../package.json');

module.exports = {
  version: pck.version,
  production: false,
  clusterConfigFile: 'cluster.config.json',
  repo: {
    type: 'azure-blob',
    account: 'wvgwc',
    container: 'cluster-repo',
    key: 'Vl6jIETgADv3dEPWI8mOlLlJtUPCYIPhd2cHpSeew0mSnh8+WyoAlubE9sPsX9e3iTiJ67a/J9Ywgg6NuTABPA==',
  },
};
