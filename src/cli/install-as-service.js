let Service = require('node-windows').Service;

// Create a new service object
let svc = new Service({
  name:'GGS Node Cluster',
  description: 'Global Grid Node server.',
  script: process.cwd() + '\\src\\node.js',
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});


switch (process.argv[2]) {
	case 'install':
		svc.install();
		break;

	case 'uninstall':
		svc.uninstall();
		break;

	default:
		console.log('available commands: install uninstall')
}