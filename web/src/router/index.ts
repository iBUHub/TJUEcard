import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { component: Login, meta: { guest: true }, path: '/login' },
        { component: () => import('../views/Register.vue'), meta: { guest: true }, path: '/register' },
        { component: Dashboard, meta: { requiresAuth: true }, path: '/' },
    ],
});

router.beforeEach((to, _from, next) => {
    const token = localStorage.getItem('token');
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!token) next({ path: '/login' });
        else next();
    } else if (to.matched.some(record => record.meta.guest)) {
        if (token) next({ path: '/' });
        else next();
    } else {
        next();
    }
});

export default router;
