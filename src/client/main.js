import Vue from 'vue';
import VueRouter from 'vue-router';
import VueResource from 'vue-resource';
import Vuetify from 'vuetify';
import App from './App.vue';
import SocketService from './SocketService';

import Home from './views/Home.vue';
import Deployments from './views/Deployments.vue';
import Cluster from './views/Cluster.vue';
import Settings from './views/Settings.vue';

import 'vuetify/dist/vuetify.css';

Vue.use(VueResource);
Vue.use(VueRouter);
Vue.use(Vuetify);
Vue.use(SocketService);

const routes = [{
    path: '/',
    component: Home
  },
  {
    path: '/deployments',
    component: Deployments
  },
  {
    path: '/jobs',
    component: Cluster
  },
  {
    path: '/settings',
    component: Settings
  },
];


const router = new VueRouter({
  routes,
});


new Vue({
  el: '#app',
  router,
  template: '<app/>',
  components: {
    App
  },
});