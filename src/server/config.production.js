// const extend = require('extend');
const config = require('./config');

// overwrite config with production settings
config.production = true;

// config.gwc = extend(config.gwc, {
//   host: 'http://*',
//   cwd: 'C:\\Pyxis\\NextGen\\GeoWebCore\\',
//   exec: 'C:\\Pyxis\\NextGen\\GeoWebCore\\GeoWebCore.exe',

//   cacheFolder: 'P:\\PYXCache.new\\',
//   filesFolder: 'S:\\Galleries\\',

//   serverPorts: [63000, 63001, 63002, 63003, 63004, 63005, 63006, 63007],
//   searchPorts: [],
// });

module.exports = config;
