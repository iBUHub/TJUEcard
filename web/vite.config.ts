import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 后端 API 端口
// - 本地 SQLite 模式: 3000 (npm run dev:local)
// - Wrangler 模式: 8787 (wrangler dev)
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
