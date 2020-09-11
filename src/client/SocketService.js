/* globals window,Vue */
import store from './Store';

export default {
  install(Vue, options) {
    function updateRunningServices() {
      store.state.deploymentRunning = false;
      let deploymentId = '';
      if (store.state.clusterConfig && store.state.clusterConfig.deployment) {
        deploymentId = `${store.state.clusterConfig.deployment.name}:${store.state.clusterConfig.deployment.version}`;
      }
      store.state.jobTasks = {};
      const jobNames = {};
      store.state.jobs.forEach((job) => {
        jobNames[job.id] = job.name;
        if (job.status === 'running') {
          if (job.id === deploymentId) {
            store.state.deploymentRunning = true;
          }
        }
        store.state.jobTasks[job.id] = [];
      });

      store.state.tasks.forEach((task) => {
        if (task.details.job in jobNames) {
          store.state.jobTasks[task.details.job].push(task);
        }
      });
    }

    function makeTagsSearchable() {
      for (const url of store.state.urls) {
        url.searchText = `${url.url} ${url.tags.join(' ')}`;
      }
    }

    function updateUrlsActive() {
      const activeUrls = {};
      store.state.tasks.forEach((task) => {
        if (task.status === 'running' && task.info.url) {
          activeUrls[task.info.url] = true;
        }
      });

      // update urls..
      store.state.urls.forEach((url) => {
        url.active = url.url in activeUrls;
      });
    }

    const socket = window.io();
    Vue.prototype.$socket = socket;

    socket.on('connect', () => {
      store.state.connected = true;

      // get list of deployments first thing we do
      socket.emit('start-list-nodes');
    });
    socket.on('disconnect', () => {
      store.state.connected = false;
    });

    socket.on('version', (version) => {
      store.state.version = version;
    });

    socket.on('roots', (urls) => {
      store.state.urls = urls;
      makeTagsSearchable();
      updateUrlsActive();
      store.emit('urls', urls);
    });

    socket.on('gallery-status', (geosources) => {
      store.state.geoSources = geosources;
    });

    socket.on('cluster-config', (clusterConfig) => {
      store.state.clusterConfig = clusterConfig;
    });

    socket.on('jobs', (jobs) => {
      store.state.jobs = jobs;
      updateRunningServices();
    });

    socket.on('nodes', (nodes) => {
      store.state.nodes = nodes;
      store.state.totalCpu = 0;
      store.state.totalMemory = 0;
      for (const node of store.state.nodes) {
        store.state.totalCpu += node.config.cpus;
        store.state.totalMemory += node.config.mem;
      }
    });

    socket.on('job-update', (jobUpdate) => {
      let jobFound = false;
      for (let i = 0; i < store.state.jobs.length; i++) {
        const job = store.state.jobs[i];
        if (job.id === jobUpdate.id) {
          job.status = jobUpdate.status;
          job.data = jobUpdate.data;
          jobFound = true;
          break;
        }
      }
      if (!jobFound) {
        // if we got here, this is a new job
        store.state.jobs.unshift(jobUpdate);
      }
      updateRunningServices();
    });

    socket.on('tasks', (tasks) => {
      store.state.tasks = tasks;
      updateUrlsActive();
      updateRunningServices();
      store.emit('tasks', store.state.tasks);
    });
    socket.on('task-update', (taskUpdate) => {
      let taskFound = false;
      for (let i = 0; i < store.state.tasks.length; i++) {
        const task = store.state.tasks[i];
        if (task.id === taskUpdate.id) {
          task.status = taskUpdate.status;
          task.usage = taskUpdate.usage;
          task.info = taskUpdate.info;
          task.log = taskUpdate.log;
          task.endpoints = taskUpdate.endpoints;
          taskFound = true;
          break;
        }
      }
      if (!taskFound) {
        // if we got here, this is a new task
        store.state.tasks.unshift(taskUpdate);
      }
      updateUrlsActive();
      updateRunningServices();
      store.emit('tasks', store.state.tasks);
    });
  },
};
