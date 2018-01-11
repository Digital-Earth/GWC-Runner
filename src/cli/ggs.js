const parseArgs = require('minimist');
const Repo = require('../server/Repo');
const config = require('../server/config');

console.log(process.argv);

switch (process.argv[2]) {

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
}