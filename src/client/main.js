import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import App from './App.vue';
import SocketService from './SocketService';

import Home from './components/Home.vue';
import Cluster from './components/Cluster.vue';
import DataSets from './components/DataSets.vue';
import GeoSources from './components/GeoSources.vue';
import Deployments from './components/Deployments.vue';

import 'vuetify/dist/vuetify.css';

Vue.use(VueRouter);
Vue.use(Vuetify);
Vue.use(SocketService);

const routes = [
  { path: '/', component: Home },
  { path: '/jobs', component: Cluster },
  { path: '/datasets', component: DataSets },
  { path: '/geosources', component: GeoSources },
  { path: '/deployments', component: Deployments },
];


const router = new VueRouter({
  routes,
});


new Vue({
  el: '#app',
  router,
  template: '<app/>',
  components: { App },
});

