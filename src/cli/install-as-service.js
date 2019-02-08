const { Service } = require('node-windows');
const parseArgs = require('minimist');

module.exports = () => {
  const options = parseArgs(process.argv.slice(4));

  // create environment variables
  const env = [
    { name: 'GGS_ROOT', value: `${process.cwd()}` },
    { name: 'GGS_CONFIG', value: `${process.cwd()}\\node.config.json` },
  ];
  if (options.ui) {
    env.push({ name: 'GGS_UI', value: 1 });
  }
  // Create a new service object
  const svc = new Service({
    name: 'GGS Cluster',
    description: 'Global Grid Systems node controller.',
    script: `${process.cwd()}\\src\\boot-as-service.js`,
    env,
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
  node ggs service install [--ui]
  node ggs service uninstall`);
  }
};
