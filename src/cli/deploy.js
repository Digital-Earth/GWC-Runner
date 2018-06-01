const parseArgs = require('minimist');
const extend = require('extend');
const path = require('path');
const Repo = require('../server/Repo');
const es6template = require('es6-template');
const config = require('../server/config');
const fs = require('fs');
const { exec } = require('child_process');
const beautify = require('json-beautify');
const nodeConfig = require('../nodeConfig');


module.exports = () => {
  if (process.argv[2] !== 'deploy') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  // overwrite node config if GGS_DEPLOYMENTS is set
  if (process.env.GGS_DEPLOYMENTS) {
    nodeConfig.deployments = process.env.GGS_DEPLOYMENTS;
  }

  const options = parseArgs(process.argv.slice(3));
  if (options.d) {
    function deployDeployment(deployment) {
      console.log('deployment started');
      console.log('------------------------');
      console.log(beautify(deployment, null, 2, 100));

      const deploymentPath = path.join(nodeConfig.deployments || 'deployments', deployment.name);
      const repo = new Repo(extend({}, config.repo, { path: deploymentPath }));

      const products = Object.keys(deployment.products);

      function deployNextService() {
        if (products.length === 0) {
          console.log('------------------------');
          console.log('deployment completed');
          return;
        }
        const productName = products.shift();
        const product = deployment.products[productName];

        console.log('------------------------');
        console.log(`deploying product ${productName} : product=${product.product} version=${product.version}`);
        repo.download(product.product, product.version, productName).then((dir) => {
          console.log('------------------------');
          console.log(`product ${productName} downloaded to ${dir}`);
          if (!product.setup) {
            deployNextService();
          } else {
            const locals = extend({}, nodeConfig, deployment.variables);
            const setupCommand = es6template(product.setup, locals);
            console.log('------------------------');
            console.log(`setup product ${productName} : ${setupCommand}`);
            console.log('------------------------');
            exec(setupCommand, {
              cwd: dir,
            }, (error, stdout, stderr) => {
              if (error) {
                console.log(error);
              } else {
                console.log(stdout, stderr);
              }
              deployNextService();
            });
          }
        }).catch((error) => {
          console.log('------------------------');
          console.log(`product ${productName} failed to download: ${error}`);
          deployNextService();
        });
      }

      deployNextService();
    }

    if (fs.existsSync(options.d)) {
      const deploymentFile = options.d;
      const deployment = JSON.parse(fs.readFileSync(deploymentFile));
      deployment.name = 'local';
      deployDeployment(deployment);
    } else {
      const repo = new Repo(extend({}, config.repo, { path: path.join(nodeConfig.deployments || 'deployments') }));

      repo.downloadDeployment(options.d, options.v, (error, result) => {
        if (error) {
          console.log(error);
        } else {
          const deployment = JSON.parse(fs.readFileSync(result.filePath));
          deployment.name = `${result.product}.${result.version}`;
          deployDeployment(deployment);
        }
      });
    }
  } else if (options.p) {
    const repo = new Repo(config.repo);

    repo.download(options.p, options.v, `${options.p}.${options.v}`, (error, result) => {
      console.log(error, result);
    });
  } else {
    console.log('usage: node ggs.js download -p|product=lb [-v|version=1.2.3]');
  }
};
