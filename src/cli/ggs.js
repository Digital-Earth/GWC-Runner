const parseArgs = require('minimist');
const Repo = require('../server/Repo');
const config = require('../server/config');
const io = require('socket.io-client');

switch (process.argv[2]) {

	//is product version from the repo
	case 'list':
	case 'l':
		{
			let options = parseArgs(process.argv.slice(3), { 'p': 'product' });

			let repo = new Repo(config.repo);

			repo.list(options.p,function(error,result) {
				console.log(error,result);
			});
		}
		break;

	//upload product from the repo
	case 'upload':
	case 'u':
		{
			let options = parseArgs(process.argv.slice(3), { 'p': 'product', 'v': 'version' });
			if (!options.p || options._.length != 1) {
				console.log('usage: node ggs.js upload -p|product=lb [-v|version=1.2.3] folder');
				return;
			}

			let repo = new Repo(config.repo);

			repo.upload(options.p, options.v, options._[0], function (error, result) {
				console.log(error, result);
			});
		}
		break;

	//download product from the repo
	case 'download':
	case 'd':
		{
			let options = parseArgs(process.argv.slice(3), { 'p': 'product', 'v': 'version' });
			if (!options.p) {
				console.log('usage: node ggs.js download -p|product=lb [-v|version=1.2.3]');
				return;
			}

			let repo = new Repo(config.repo);

			repo.download(options.p, options.v, function (error, result) {
				console.log(error, result);
			});
		}
		break;

	//track changes on a single job.
	//usage: ggs track -j=gwc http://our.cluster.com/
	case 'track':
		{
			let options = parseArgs(process.argv.slice(3), { 'j': 'job' });

			let job = options.j;

			let cluster = options._[0] || 'http://localhost:8080';

			let socket = io(cluster + "/job");

			socket.on('connect', function() {
				console.log('connected');
				socket.emit('start-tracking',job);
			})

			socket.on('job-update', function(job) {
				console.log('job-update',job);
			})

			socket.on('disconnect', function() {
				console.log('disconnected');
			});
		}
		break;
}