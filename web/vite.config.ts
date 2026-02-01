import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Backend API Port
// - Local SQLite mode: 3000 (npm run dev:local)
// - Wrangler mode: 8787 (wrangler dev)
const API_PORT = process.env.VITE_API_PORT || '3000';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:' + API_PORT,
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, ''),
            },
        },
    },
});
