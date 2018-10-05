const fs = require('fs');
const ms = require('ms');
const socketIo = require('socket.io');
const parseArgs = require('minimist');
const serverContext = require('./ServerContext');
const Job = require('./Job');
const DeploymentJob = require('./DeploymentJob');

const createGwcDetails = require('./jobs/gwc');

const activeDeploymentFile = 'cluster.config.json';

const Api = require('./socket.api.js');

Api.attach = (server, app) => {
  const options = parseArgs(process.argv);
  console.log('setup socket.io API');

  const io = socketIo(server);


  if (fs.existsSync(activeDeploymentFile)) {
    Api.activeDeployment = JSON.parse(fs.readFileSync(activeDeploymentFile, 'utf8'));
  }

  Api.attachNodesNamespace(io.of('/node'), options);
  Api.attachEndpointsNamespace(io.of('/endpoint'), options);

  function transformTask(task) {
    return {
      id: task.id,
      node: task.node,
      name: task.name,
      status: task.status,
      details: task.details,
      endpoints: task.endpoints,
      usage: task.usage || { cpu: 0, memory: 0 },
      info: task.state || {},
      log: task.log || [],
    };
  }

  function transformJob(job) {
    return {
      id: job.id,
      name: job.name,
      status: job.state.status,
      state: job.state.state,
      data: job.state.data,
      details: job.state.details,
    };
  }

  function sendTaskUpdate(task) {
    io.emit('task-update', transformTask(task));
  }

  function sendJobs() {
    io.emit('jobs', serverContext.jobs.map(transformJob));
  }

  function sendJobUpdate(job) {
    io.emit('job-update', transformJob(job));
  }

  function handleActiveDeployment(/* deployment */) {
    io.emit('active-deployment', Api.activeDeployment);
  }

  function sendInitialUpdate() {
    io.emit('tasks', serverContext.cluster.tasks().map(transformTask));
    io.emit('roots', serverContext.roots || []);
    io.emit('nodes', serverContext.nodes || []);
    io.emit('gallery-status', serverContext.geoSources || []);
    io.emit('active-deployment', Api.activeDeployment);
    sendJobs();
  }

  serverContext.on('roots', (roots) => {
    io.emit('roots', roots || []);
  });

  serverContext.on('nodes', (nodes) => {
    io.emit('nodes', nodes || []);
  });

  serverContext.on('geoSources', (/* goeSources */) => {
    io.emit('gallery-status', serverContext.geoSources || []);
  });

  serverContext.on('job', job => sendJobUpdate(job));

  serverContext.jobs = [];

  Api.trackJob = (job) => {
    job.on('start', () => {
      serverContext.jobs.push(job);
      serverContext.emit('job', job);
    });

    job.state.on('mutate', () => {
      serverContext.emit('job', job);
    });

    job.on('done', () => {
      serverContext.jobs.splice(serverContext.jobs.indexOf(job), 1);
      serverContext.emit('job', job);
    });

    job.on('cancelled', () => {
      serverContext.jobs.splice(serverContext.jobs.indexOf(job), 1);
      serverContext.emit('job', job);
    });
  };

  serverContext.cluster.on('new-task', sendTaskUpdate);
  serverContext.cluster.on('task-end', sendTaskUpdate);
  serverContext.cluster.on('mutate', sendTaskUpdate);

  serverContext.nodes = serverContext.cluster.nodes();

  serverContext.cluster.on('node-connected', (node) => {
    console.log('connnected', node);
    serverContext.nodes.push(node);
    serverContext.emit('nodes', serverContext.nodes);
  });
  serverContext.cluster.on('node-disconnected', (node) => {
    console.log('disconnnected', node);
    const nodes = serverContext.nodes.filter(n => n.id !== node.id);
    serverContext.emit('nodes', nodes);
  });

  io.on('connection', (socket) => {
    console.log('connected');

    sendInitialUpdate();

    socket.on('kill-task', (taskId) => {
      serverContext.cluster.killTaskById(taskId);
    });

    socket.on('kill-job', (jobId) => {
      for (const job of serverContext.jobs) {
        if (job.id === jobId) {
          job.kill();
        }
      }
    });

    socket.on('start-add-url', (url) => {
      const job = Api.jobs.addUrl({ url });
      Api.trackJob(job);
      job.start();
    });

    socket.on('set-active-deployment', (deployment) => {
      fs.writeFileSync(activeDeploymentFile, JSON.stringify(deployment));
      Api.activeDeployment = deployment;
      handleActiveDeployment();
    });

    socket.on('start-deploy-deployment', (deployment) => {
      const job = Api.jobs.deployDeployment(deployment);
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-remove-deployment', (deployment) => {
      const job = Api.jobs.removeDeployment(deployment);
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-list-nodes', () => {
      const job = Api.jobs.listNodes();
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-validate', (url) => {
      const job = Api.jobs.validate({ url });
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-discover', (url) => {
      const job = Api.jobs.discover({ url });
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-discover-and-validate', (urls, parallel) => {
      const job = Api.jobs.autoDiscover({ urls, parallel: parallel || 3 });
      Api.trackJob(job);
      job.start();
    });

    socket.on('update-tags', (url, addTags, removeTags) => {
      const job = Api.jobs.updateTags({ url, addTags, removeTags });
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-list', () => {
      const job = Api.jobs.list({});
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-deployment', () => {
      Api.startDeployment();
    });

    socket.on('stop-deployment', () => {
      Api.stopDeployment();
    });

    /* BEGIN - ALL LEGACY STUFF - CONSIDER REFACTOR */

    socket.on('start-download-geosource', (id) => {
      const job = Api.jobs.gwcDownloadGeoSource({ id });
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-import-geosource', (id) => {
      const job = Api.jobs.gwcImportGeoSource({ id });
      Api.trackJob(job);
      job.start();
    });

    socket.on('start-gallery-status', (id) => {
      const job = Api.jobs.gwcGalleryStatus({ id });
      Api.trackJob(job);
      job.start();
    });

    /* END - ALL LEGACY STUFF */
  });


  Api.attachRestAPI(app);

  Api.findJob = (jobIdOrName) => {
    function jobFilter(job) {
      return job.id === jobIdOrName || job.name === jobIdOrName;
    }
    return serverContext.jobs.filter(jobFilter)[0];
  };

  // additional rest API
  app.get('/jobs/:id', (req, res) => {
    const job = Api.findJob(req.params.id);
    if (job) {
      res.send(JSON.stringify(transformJob(job)));
      res.end();
    } else {
      res.status(404);
      res.send(`Job ${req.params.id} not found`);
      res.end();
    }
  });

  function startNewCliTask(jobId, args, callback) {
    const job = Api.findJob(jobId);
    if (job) {
      const taskAction = job.startNewCliTask(args);
      taskAction.on('start', () => {
        const { task } = taskAction;
        callback(null, {
          id: task.id,
          name: task.name,
          status: task.status,
          endpoints: task.endpoints,
          details: task.details,
          state: task.state,
          log: task.log,
          data: task.data,
        });
      });
    } else {
      callback(`Job ${jobId} not found`);
    }
  }

  app.get('/jobs/:id/discover', (req, res) => {
    const args = ['discover', req.query.reference];
    startNewCliTask(req.params.id, args, (error, task) => {
      if (error) {
        res.status(404);
        res.send(error);
        res.end();
      } else {
        res.send(JSON.stringify(task));
        res.end();
      }
    });
  });

  app.get('/jobs/:id/import', (req, res) => {
    const args = ['import', req.query.reference];
    startNewCliTask(req.params.id, args, (error, task) => {
      if (error) {
        res.status(404);
        res.send(error);
        res.end();
      } else {
        res.send(JSON.stringify(task));
        res.end();
      }
    });
  });

  app.get('/jobs', (req, res) => {
    res.send(JSON.stringify(serverContext.jobs.map(transformJob)));
    res.end();
  });
};

Api.startDeployment = (deployment) => {
  Api.stopDeployment();
  Api.deploymentJob = Api.jobs.runDeployment(deployment || Api.activeDeployment);
  Api.trackJob(Api.deploymentJob);
  Api.deploymentJob.start();
};

Api.stopDeployment = () => {
  if (Api.deploymentJob) {
    Api.deploymentJob.kill();
  }
  delete Api.deploymentJob;
};

Api.jobs = {
  list() {
    const job = new Job('list urls');

    job.invoke({
      service: 'cli',
      deployment: Api.activeDeployment,
      args: ['url', 'list', '-json'],
      name: 'list urls',
      state: {
        type: 'list',
      },
      killAfterIdle: ms('5m'),
    }).then((taskState) => {
      const roots = (taskState.data.roots || []).map(root => ({
        url: root.Uri,
        status: root.Status,
        datasets: root.DataSetCount,
        working: Math.round((100 * root.VerifiedDataSetCount) / root.DataSetCount),
        broken: root.BrokenDataSetCount,
        verified: root.VerifiedDataSetCount,
        unknown: root.UnknownDataSetCount,
        tags: root.Metadata && root.Metadata.Tags ? root.Metadata.Tags : [],
        lastDiscovered: new Date(root.LastDiscovered),
        lastVerified: new Date(root.LastVerified),
      }));
      serverContext.emit('roots', roots);
      return roots;
    }).complete();

    return job;
  },
  addUrl(details) {
    const job = new Job('add url');
    job.invoke({
      service: 'cli',
      deployment: Api.activeDeployment,
      args: ['url', 'add', details.url],
      name: `add ${details.url}`,
      state: {
        type: 'add',
        url: details.url,
      },
      killAfterIdle: ms('1m'),
    }).complete();

    return job;
  },
  updateTags(details) {
    const job = new Job('update');
    const args = ['url', 'update'];

    if (details.addTags) {
      for (const tag of details.addTags) {
        args.push(`-add-tag=${tag}`);
      }
    }
    if (details.removeTags) {
      for (const tag of details.removeTags) {
        args.push(`-remove-tag=${tag}`);
      }
    }
    args.push(details.url);

    job.invoke({
      service: 'cli',
      deployment: Api.activeDeployment,
      args,
      state: {
        type: 'update',
        url: details.url,
      },
      killAfterIdle: ms('1m'),
    })
      .then((taskState) => {
        if (taskState.state.root) {
          serverContext.emit('root', taskState.state.root);
        }
      })
      .complete();

    return job;
  },
  discover(details) {
    const job = new Job('discover');

    job.invoke({
      service: 'cli',
      deployment: Api.activeDeployment,
      args: ['url', 'discover', details.url],
      name: `discover ${details.url}`,
      state: {
        type: 'discover',
        url: details.url,
      },
      killAfterIdle: ms('1h'),
    })
      .then((taskState) => {
        if (taskState.state.root) {
          serverContext.emit('root', taskState.state.root);
        }
      })
      .complete();

    return job;
  },
  validate(details) {
    const job = new Job('validate');

    let skipDataset = 0;

    job.keepAlive(() => job.invoke({
      service: 'cli',
      deployment: Api.activeDeployment,
      args: ['url', 'validate', '-n=50', '-clean', `-skip=${skipDataset}`, details.url],
      name: `validate ${details.url}`,
      state: {
        type: 'validate',
        url: details.url,
        skip: skipDataset,
      },
      killAfterIdle: ms('1h'),
    }), {
      while(taskState) {
        if (taskState.state.root) {
          serverContext.emit('root', taskState.state.root);
          return taskState.state.datasets > 0;
        } if (skipDataset < 10) {
          skipDataset++;
          return true;
        }
        return false;
      },
    }).then((taskState) => {
      if (!taskState.state.root) {
        return job.invoke({
          service: 'cli',
          deployment: Api.activeDeployment,
          args: ['url', 'update', '-status=Broken', details.url],
          name: `update ${details.url}`,
          state: {
            type: 'update',
            url: details.url,
            status: 'Broken',
          },
          killAfterIdle: ms('1m'),
        });
      } else if (taskState.state.root.status === 'Broken') {
        return job.invoke({
          service: 'cli',
          deployment: Api.activeDeployment,
          args: ['url', 'update', '-status=Discovered', details.url],
          state: {
            type: 'update',
            url: details.url,
            status: 'Discovered',
          },
          killAfterIdle: ms('1m'),
        });
      }
      return undefined;
    }).complete();

    return job;
  },
  discoverAndValidate(details) {
    const job = new Job('discover and validate');

    job.invoke(Api.jobs.discover(details))
      .invoke(Api.jobs.validate(details))
      .complete();

    return job;
  },
  autoDiscover(details) {
    const job = new Job('auto discover');

    const discoverUrl = url => Api.jobs.discoverAndValidate({ url });
    const discoverUrlOptions = { parallel: details.parallel || 3 };

    job.forEach(details.urls, discoverUrl, discoverUrlOptions).complete();

    return job;
  },
  gwcDownloadGeoSource(details) {
    const job = new Job('download GeoSource');

    job.invoke({
      name: `download ${details.id}`,
      service: 'gwc',
      deployment: Api.activeDeployment,
      args: ['-d', `pyxis://${details.id}`],
      state: {
        geoSource: details.id,
      },
    }).complete();

    // job.invoke(createGwcDetails('download-geosource', `pyxis://${details.id}`)).complete();

    return job;
  },
  gwcImportGeoSource(details) {
    const job = new Job('import GeoSource');

    job.invoke({
      name: `download ${details.id}`,
      service: 'gwc',
      deployment: Api.activeDeployment,
      args: ['-import', `pyxis://${details.id}`],
      state: {
        geoSource: details.id,
      },
    }).complete();

    // job.invoke(createGwcDetails('import-geosource', `pyxis://${details.id}`)).complete();

    return job;
  },
  gwcGalleryStatus(details) {
    const job = new Job('gallery status');

    job.invoke(createGwcDetails('gallery-status', details.id)).then((taskState) => {
      serverContext.emit('geoSources', taskState.data.geoSources || []);
    }).complete();

    return job;
  },
  listNodes() {
    /* eslint-disable no-template-curly-in-string */
    const job = new Job('nodes');

    job.forEachNode('*', {
      name: 'info',
      cwd: '${rootPath}',
      exec: '${nodePath}',
      args: ['ggs.js', 'local'],
    }).then((results) => {
      const deploymentsPerNode = {};

      results.forEach((task) => {
        deploymentsPerNode[task.details.node] = task.data.deployments;
      });

      serverContext.nodes.forEach((node) => {
        /* eslint-disable no-param-reassign */
        if (node.id in deploymentsPerNode) {
          node.deployments = deploymentsPerNode[node.id];
        }
      });

      serverContext.emit('nodes', serverContext.nodes);
      return serverContext.nodes;
    }).complete();

    return job;
  },
  deployDeployment(details) {
    /* eslint-disable no-template-curly-in-string */
    const job = new Job('deployment');

    job.forEachNode('*', {
      name: 'deploy-deployment',
      cwd: '${rootPath}',
      exec: '${nodePath}',
      args: ['ggs.js', 'deploy', `-d=${details.name}`, `-v=${details.version}`],
    }).complete();

    return job;
  },
  removeDeployment(details) {
    /* eslint-disable no-template-curly-in-string */
    const job = new Job('deployment');

    job.forEachNode('*', {
      name: 'remove-deployment',
      cwd: '${rootPath}',
      exec: '${nodePath}',
      args: ['ggs.js', 'remove', `-d=${details.name}`, `-v=${details.version}`],
    }).complete();

    return job;
  },
  runDeployment(deployment) {
    return DeploymentJob(deployment);
  },
};

module.exports = Api;
