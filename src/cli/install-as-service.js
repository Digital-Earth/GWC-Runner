import { Service } from 'node-windows';

module.exports = () => {
  // Create a new service object
  const svc = new Service({
    name: 'GGS Node Cluster',
    description: 'Global Grid Node server.',
    script: `${process.cwd()}\\src\\node.js`,
  });

  // Listen for the "install" event, which indicates the
  // process is available as a service.
  svc.on('install', () => {
    svc.start();
  });


  switch (process.argv[3]) {
    case 'install':
      svc.install();
      break;

    case 'uninstall':
      svc.uninstall();
      break;

    default:
      console.log(`
available commands:
  node ggs service install 
  node ggs service uninstall`);
  }
};
