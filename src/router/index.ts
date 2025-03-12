// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router';
import Sim from '../components/Sim.vue';
import Home from '../components/Home.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/sim', component: Sim },
];

const router = createRouter({
    history: createWebHashHistory(), // Use hash mode (fixes GitHub Pages refresh issue)
  routes,
});

export default router;