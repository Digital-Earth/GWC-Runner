import Vue from 'vue';
import VueRouter from 'vue-router';
import VueResource from 'vue-resource';
import Vuetify from 'vuetify';
import 'vuetify/dist/vuetify.css';

import App from './App.vue';
import SocketService from './SocketService';

import Home from './views/Home.vue';
import Deployments from './views/Deployments.vue';
import Cluster from './views/Cluster.vue';
import Settings from './views/Settings.vue';


import './assets/favicon-16x16.png';
import './assets/favicon-32x32.png';
import './assets/favicon.ico';

Vue.use(VueResource);
Vue.use(VueRouter);
Vue.use(Vuetify);
Vue.use(SocketService);

const routes = [{
  path: '/',
  component: Home,
},
{
  path: '/deployments',
  component: Deployments,
},
{
  path: '/jobs',
  component: Cluster,
},
{
  path: '/settings',
  component: Settings,
},
];


const router = new VueRouter({
  routes,
});

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  router,
  template: '<app/>',
  components: {
    App,
  },
});
