import Vue from 'vue';

let vm = new Vue();

let state = {
    connected: false,
    services: {
        gwc:false,
        proxy: false 
    },
    urls: [],
    geoSources: [],
    nodes: [],
    jobs: [],
    jobTasks: {},
    tasks: [],
    pages: {
        datasets: {
            pagination: {
                sortBy: "verified",
                rowsPerPage: 10,
                descending: false
            },
            search: ""
        }
    }
};

export default {
    state,

    // aggregate a list by fields:
    // usage: store.aggregate(store.state.urls,'verified','unknown','broken') -> { verified: 1212, ... }
    aggregate: function(list) {
        let fields = Array.from(arguments);
        fields.shift();

        let result = {};
        fields.forEach(field => result[field] = 0);

        list.forEach(function(item) {
            fields.forEach(field => result[field] += +item[field]);
        });

        return result;
    },
    on(event,callback) {
        vm.$on(event,callback);
    },
    emit(event,args) {
        vm.$emit(event,args);
    },
    clearAllDone() {
        state.tasks = state.tasks.filter((task)=>task.status != 'done');
        state.jobs = state.jobs.filter((job)=>job.status != 'done' && job.status != 'cancelled');
        for(let job of state.jobs) {
            let tasks = state.jobTasks[job.id];
            if (tasks) {
                state.jobTasks[job.id] = tasks.filter((task)=>task.status != 'done');
            }
        }
    }
}