import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';
import Game from '../views/Game.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '游戏大厅' }
  },
  {
    path: '/game/:id',
    name: 'Game',
    component: Game,
    meta: { title: '游戏' },
    props: true
  },
  {
    // 未知路径回到大厅，避免空白页
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
