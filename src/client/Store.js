import Vue from 'vue';

let vm = new Vue();

export default {
    state: {
        connected: false,
        services: {
            gwc:false,
            proxy: false 
        },
        jobs: [],
        urls: [],
        geoSources: [],
    },
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
    }
}