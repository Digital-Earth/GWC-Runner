module.exports = {
  // cli: {
  //   cwd: 'c:\\pyxis\\trunk2\\application\\PyxisCLI\\bin\\Release',
  //   exec: 'c:\\pyxis\\trunk2\\application\\PyxisCLI\\bin\\Release\\pyx.exe',
  // },
  // proxy: {
  //   cwd: 'c:\\pyxis\\repos\\GwcProxy',
  //   exec: 'c:\\Program Files\\nodejs\\node.exe',
  //   start: 'server.js',

  //   keepAlive: true,
  // },
  // gwc: {
  //   cwd: 'c:\\pyxis\\trunk2\\application\\GeoWebCore\\bin\\Release',
  //   exec: 'c:\\pyxis\\trunk2\\application\\GeoWebCore\\bin\\Release\\GeoWebCore.exe',

  //   cacheFolder: 'D:\\pyxis-gallery\\PYXCache\\',
  //   filesFolder: 'D:\\pyxis-gallery\\UserFiles\\',

  //   // use this host for poduction
  //   // host: 'http://*',
  //   host: 'http://localhost',
  //   masterHost: 'http://localhost',
  //   masterPorts: [64444],
  //   serverPorts: [63000, 63001, 63002, 63003],
  //   importPorts: [64000],
  //   searchPorts: [64100, 64101, 64102, 64103, 64104, 64105],

  //   // if true, the the runner will make sure those instance keep starting.
  //   keepAlive: true,

  //   // this can be set to kill GWC that exceeded memory limit for safe operations
  //   // the runner will kill a GWC if it:
  //   //   a) been idle for safeIdleTimeInMinutes
  //   //   b) it memory is more than memoryLimitInMB
  //   safeIdleTimeInMinutes: 10,
  //   memoryLimitInMB: 1400,
  // },
  production: false,
  repo: {
    type: 'azure-blob',
    account: 'wvgwc',
    container: 'cluster-repo',
    key: 'Vl6jIETgADv3dEPWI8mOlLlJtUPCYIPhd2cHpSeew0mSnh8+WyoAlubE9sPsX9e3iTiJ67a/J9Ywgg6NuTABPA==',
  },
};
