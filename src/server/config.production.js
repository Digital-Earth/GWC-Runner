var extend = require('extend');
var config = require('./config');

//overwrite config with production settings
config.production = true;

config.cluster = {
	dev: false,
	root: 'http://localhost:8081'
}

config.gwc = extend(config.gwc, {
	host: 'http://*',
	cwd: 'C:\\Pyxis\\NextGen\\GeoWebCore\\',
	exec: 'C:\\Pyxis\\NextGen\\GeoWebCore\\GeoWebCore.exe',
	
	cacheFolder: 'P:\\PYXCache.new\\',
	filesFolder: 'S:\\Galleries\\',
});

module.exports = config;