const http = require('http');
const express = require('express');
const path = require('path');

const app = express();

if (process.env.NODE_ENV === 'production') {
	//upgrade config to production
	var config = require('./server/config.production');
} else {
	var config = require('./server/config');
}

const server = new http.Server(app);

//install socket.io api
var api = require('./server/socket.api');
api.attach(server, app);

const PORT = process.env.PORT || 8081;

server.listen(PORT, function(err) {
	console.log('root node is running ' + PORT);
});