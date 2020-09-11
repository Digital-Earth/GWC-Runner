/* eslint-disable global-require */
switch (process.argv[2]) {
  case 'setup':
    require('./src/cli/setup')();
    break;
  case 'local':
    require('./src/cli/local')();
    break;
  case 'list':
    require('./src/cli/list')();
    break;
  case 'upload':
    require('./src/cli/upload')();
    break;
  case 'deploy':
    require('./src/cli/deploy')();
    break;
  case 'remove':
    require('./src/cli/remove')();
    break;

  case 'service':
    require('./src/cli/install-as-service')();
    break;

  case 'serve':
    require('./src/node');
    break;

  case 'ui':
    require('./src/app');
    break;

  case 'build':
    require('./src/cli/build')();
    break;

  case 'cli':
    require('./src/cli/cli')();
    break;

  case 'help':
  default:
    /* eslint-disable no-tabs */
    console.log(`
usage: node ggs [task]
  help     - show help screen

  setup    - setup node configuration (run this the first time)
    setup default - generate default configuration
    setup show - show node configuration
    setup set|unset [--variable=value] - add|remove deployment variables to override

  service  - install node as a service on local machine

  serve    - start a local node.
              --config to overwrite node config
              --port to overwrite startup port

  ui        - start a local node ui on port 8080
              --local start a local cluster with UI
              --cluster to connect to a remote cluster
              --autorun to start the active deployment on start

  cli      - invoke cli commands on cluster

  local    - display list of local deployments
  list     - list available deployments & products on central repository
  upload   - upload deployments & products to central repository

  deploy   - deploy deployments & products from central repository
             -d=deployment-name -v=deployment-version
             --save - update cluster.config deployment/

  remove   - remove local deployment

  build    - build project and create zip file ready for deployment
`);
    break;
}
