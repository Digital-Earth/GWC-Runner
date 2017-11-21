module.exports = {
	cli: {
		cwd: 'c:\\pyxis\\trunk2\\application\\PyxisCLI\\bin\\Release',
		exec: 'c:\\pyxis\\trunk2\\application\\PyxisCLI\\bin\\Release\\pyx.exe',
	},
	gwc: {
		cwd: 'c:\\pyxis\\trunk2\\application\\GeoWebCore\\bin\\Release',
		exec: 'c:\\pyxis\\trunk2\\application\\GeoWebCore\\bin\\Release\\GeoWebCore.exe',
		
		cacheFolder: 'D:\\pyxis-gallery\\PYXCache\\',
		filesFolder: 'D:\\pyxis-gallery\\UserFiles\\',
		
		//use this host for poduction
		//host: 'http://*',
		host: 'http://localhost',
		masterHost: 'http://localhost',
		masterPorts: [64444],
		serverPorts: [63000,63001,63002,63003],
		importPorts: [64000],

		//if true, the the runner will make sure those instance keep starting.
		keepAlive: true,

		//this can be set to kill GWC that exceeded memory limit for safe operations
		//the runner will start killing a GWC if it been idle for safeIdleTimeInMinutes and it memory is more than memoryLimitInMB
		safeIdleTimeInMinutes: 10,
		memoryLimitInMB: 1400
	},
	production: false
}