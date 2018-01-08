const http = require('http');
const express = require('express');
const path = require('path');
const getPort = require('get-port');
const io = require('socket.io-client');
const { TaskState } = require('./server/TaskState');
const Task = require('./server/Task');
const {LocalTaskManager} = require('./server/TaskManager');

const app = express();

if (process.env.NODE_ENV === 'production') {
	//upgrade config to production
	var config = require('./server/config.production');

	console.log(config);
} else {
	var config = require('./server/config');
}

const server = new http.Server(app);

const master = process.argv[2] || 'http://localhost:8080';

console.log('master: ' + master);

const masterClient = io(master+"/node");

const manager = new LocalTaskManager(masterClient);

masterClient.on('connect',function() {
	console.log('connected to master', master);
});

masterClient.on('disconnect',function() {
	console.log('disconnected from master', master);
});

//TODO: think if we need http in the first place?
getPort().then(function(port) {
	server.listen(port, function(err) {		
		console.log('live and running at ' + port);
	});
})
