const http = require('http');
const express = require('express');
const path = require('path');

const app = express();

if (process.env.NODE_ENV === 'production') {
	//upgrade config to production
	var config = require('./server/config.production');

	console.log(config);

	// You probably have other paths here
	app.use(express.static('dist'));
} else {
	var config = require('./server/config');

	const webpack = require('webpack');
	const webpackConfig = require('./webpack.config');
	const compiler = webpack(webpackConfig);
	
	// Create the app, setup the webpack middleware
	
	app.use(require('webpack-dev-middleware')(compiler, {
		noInfo: true,
		publicPath: webpackConfig.output.publicPath,
	}));
	app.use(require('webpack-hot-middleware')(compiler));  

	// app.get('/', function(req, res) {
	// 	res.sendFile(path.join(__dirname, '/src/index.html'));
	// });
}

const server = new http.Server(app);

//install socket.io api
var api = require('./server/api');
api.attach(server);

if (config.production) {
	api.startGwc();
}

const PORT = process.env.PORT || 8080;

server.listen(PORT, function(err) {
	console.log('live and running at ' + PORT);
});