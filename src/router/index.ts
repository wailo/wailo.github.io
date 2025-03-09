// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Sim from '../components/Sim.vue';
import Home from '../components/Home.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/sim', component: Sim },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;