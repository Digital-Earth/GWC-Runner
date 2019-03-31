const wincmd = require('node-windows');
const parseArgs = require('minimist');

module.exports = () => {
  function setupService() {
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
    const svc = new wincmd.Service({
      name: 'GGS Cluster',
      description: 'Global Grid Systems node controller.',
      script: `${process.cwd()}\\src\\boot-as-service.js`,
      env,
    });

    svc.stopparentfirst = true;
    svc.workingdirectory = process.cwd();

    switch (process.argv[3]) {
      case 'install':
        console.log('Installing service...');
        svc.install();
        svc.on('install', () => {
          console.log('Service installed, starting...');
          svc.start();
        });
        svc.on('start', () => {
          console.log('Service Installed and completed');
        });
        break;

      case 'start':
        svc.start();
        console.log('Stating service...');
        svc.on('start', () => {
          console.log('Service started');
        });
        break;

      case 'stop':
        svc.stop();
        console.log('Stopping service...');
        svc.on('stop', () => {
          console.log('Service stopped');
        });
        break;

      case 'uninstall':
        console.log('Uninstalling service...');
        svc.uninstall();
        svc.on('uninstall', () => {
          console.log('Uninstall completed');
        });
        break;

      default:
        console.log(`
available commands:
  node ggs service install [--ui]
  node ggs service start
  node ggs service stop
  node ggs service uninstall`);
    }
  }

  wincmd.isAdminUser((isAdmin) => {
    if (!isAdmin) {
      console.log('To install the service, run this command with administrative privileges.');
    } else {
      setupService();
    }
  });
};
