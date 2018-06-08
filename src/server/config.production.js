// const extend = require('extend');
const config = require('./config');

// overwrite config with production settings
config.production = true;

module.exports = config;
