import Vue from 'vue';

const vm = new Vue();

const state = {
  connected: false,
  clusterConfig: undefined,
  deploymentRunning: false,
  urls: [],
  geoSources: [],
  nodes: [],
  totalCpu: 0,
  totalMemory: 0,
  jobs: [],
  jobTasks: {},
  tasks: [],
  pages: {
    datasets: {
      pagination: {
        sortBy: 'verified',
        rowsPerPage: 10,
        descending: false,
      },
      search: '',
    },
  },
};

export default {
  state,

  // aggregate a list by fields:
  // usage: store.aggregate(store.state.urls,'verified','unknown','broken') -> { verified: 1212, ... }
  aggregate(list) {
    const fields = Array.from(arguments);
    fields.shift();

    const result = {};
    fields.forEach(field => result[field] = 0);

    list.forEach((item) => {
      fields.forEach(field => result[field] += +item[field]);
    });

    return result;
  },
  on(event, callback) {
    vm.$on(event, callback);
  },
  emit(event, args) {
    vm.$emit(event, args);
  },
  clearAllDone() {
    state.tasks = state.tasks.filter(task => task.status !== 'done' && task.status !== 'lost');
    state.jobs = state.jobs.filter(job => job.status !== 'done' && job.status !== 'cancelled');
    for (const job of state.jobs) {
      const tasks = state.jobTasks[job.id];
      if (tasks) {
        state.jobTasks[job.id] = tasks.filter(task => task.status !== 'done' && task.status !== 'lost');
      }
    }
  },
  deployment() {
    return state.clusterConfig.deployment;
  },
};
