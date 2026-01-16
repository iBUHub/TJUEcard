import axios from 'axios';
import router from './router';

// Use environment variable in production, proxy in development
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            router.push('/login');
        }
        return Promise.reject(error);
    }
);

export default api;
