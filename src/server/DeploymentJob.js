const Job = require('./Job');
const es6template = require('es6-template');
const {
  getDeploymentDetails
} = require('../utils');
const serverContext = require('./ServerContext');
const clone = require('clone');

function createDeploymentJob(deployment) {
  const id = `${deployment.name}:${deployment.version}`;
  const job = new Job(id, id);
  const deploymentDetails = getDeploymentDetails(deployment, serverContext.nodeConfig);
  job.state.mutateState('config', clone(serverContext.clusterConfig));

  function buildDesiredState() {
    const desiredState = {};
    const {
      nodes
    } = serverContext;

    for (const serviceName in deploymentDetails.services) {
      const service = deploymentDetails.services[serviceName];
      if ('instancesPerNode' in service) {
        const instancesPerNode = es6template(`${service.instancesPerNode}`, deploymentDetails.variables);
        desiredState[serviceName] = {
          instancesPerNode: +instancesPerNode,
          serviceDetails: service,
          tasks: [],
          tasksPerNode: {},
        };
        for (const node of nodes) {
          desiredState[serviceName].tasksPerNode[node.id] = [];
        }
      } else if ('instances' in service) {
        const instances = es6template(`${service.instances}`, deploymentDetails.variables);
        desiredState[serviceName] = {
          instances: +instances,
          serviceDetails: service,
          tasks: [],
        };
      }
    }

    for (const task of serverContext.cluster.tasks()) {
      if (task.details.job === id) {
        const {
          service,
          node
        } = task.details;
        if (service in desiredState) {
          const serviceDesiredState = desiredState[service];
          serviceDesiredState.tasks.push(task);

          if (serviceDesiredState.instancesPerNode) {
            if (node in serviceDesiredState.tasksPerNode) {
              serviceDesiredState.tasksPerNode[node].push(task);
            }
          }
        }
      }
    }

    return desiredState;
  }

  function buildActions(desiredState) {
    const actions = [];

    for (const serviceName in desiredState) {
      const service = desiredState[serviceName];

      if (service.instances > 0) {
        if (service.tasks.length > service.instances) {
          console.log(`need to remove a task for service ${serviceName}`);
          actions.push({
            type: 'kill',
            task: service.tasks[service.tasks.length - 1]
          });
        } else if (service.tasks.length < service.instances) {
          console.log(`need to start a task for service ${serviceName}`);
          actions.push({
            type: 'start',
            task: {
              name: serviceName,
              service: serviceName,
              deployment,
            },
          });
        }
      }

      if (service.instancesPerNode > 0) {
        for (const nodeId in service.tasksPerNode) {
          const nodeTasks = service.tasksPerNode[nodeId];

          if (nodeTasks.length > service.instancesPerNode) {
            console.log(`need to remove a task for service ${serviceName} on node ${nodeId}`);
            actions.push({
              type: 'kill',
              task: nodeTasks[nodeTasks.length - 1]
            });
          } else if (nodeTasks.length < service.instancesPerNode) {
            console.log(`need to start a task for service ${serviceName} on node ${nodeId}`);
            actions.push({
              type: 'start',
              task: {
                name: serviceName,
                service: serviceName,
                deployment,
                node: nodeId,
              },
            });
          }
        }
      }
    }

    return actions;
  }

  function checkDesiredState() {
    console.log('validating state...');
    const desiredState = buildDesiredState();
    const actions = buildActions(desiredState);

    for (const action of actions) {
      if (action.type === 'start') {
        job.invoke(action.task);
      } else if (action.type === 'kill') {
        serverContext.cluster.killTaskById(action.task.id);
      } else {
        console.log(`unknown task type ${action.type}`, action);
      }
    }
  }

  let timeoutId;

  function deferredCheckDesiredState() {
    if (timeoutId) {
      global.clearTimeout(timeoutId);
    }
    timeoutId = global.setTimeout(checkDesiredState, 500);
  }

  function handleTaskChange(task) {
    if (task.details.job === id) {
      console.log(`task ${task.status} for ${task.details.service} on node ${task.details.node}`);
      deferredCheckDesiredState();
    }
  }

  serverContext.cluster.on('node-connected', deferredCheckDesiredState);
  serverContext.cluster.on('node-disconnected', deferredCheckDesiredState);
  serverContext.cluster.on('new-task', handleTaskChange);
  serverContext.cluster.on('task-end', handleTaskChange);

  job.on('cancelled', () => {
    serverContext.cluster.off('node-connected', deferredCheckDesiredState);
    serverContext.cluster.off('node-disconnected', deferredCheckDesiredState);
    serverContext.cluster.off('new-task', handleTaskChange);
    serverContext.cluster.off('task-end', handleTaskChange);
  });

  job.invoke(checkDesiredState);

  // this is used by commands to invoke a new cli commands such discover/ import/ clean cache etc.
  job.startNewCliTask = function startNewCliTask(args) {
    const newTask = {
      name: args.join(' '),
      service: 'cli',
      args: ['-cwd=${dataPath}'].concat(args),
      deployment,
    };
    return job.invoke(newTask);
  };

  return job;
}

module.exports = createDeploymentJob;