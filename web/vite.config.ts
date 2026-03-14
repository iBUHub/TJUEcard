import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Note:
    // - `process.env` only contains variables from the shell/OS environment.
    // - `.env*` files are NOT automatically loaded into `process.env` for vite.config.*.
    //   We load both repo-root and web/ env files here for convenience.
    //   Priority: process.env > web/.env* > repo-root/.env*
    //
    // IMPORTANT:
    // - Do NOT rely on process.cwd() here. When running from the repo root,
    //   Vite will still load this config file, but cwd remains the root.
    //   Resolve paths relative to this file instead.
    const webDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(webDir, '..');
    const fileEnvRoot = loadEnv(mode, repoRoot, 'VITE_');
    const fileEnvWeb = loadEnv(mode, webDir, 'VITE_');
    const fileEnv = { ...fileEnvRoot, ...fileEnvWeb };

    const getEnv = (key: string): string => (process.env[key] || fileEnv[key] || '').trim();

    // Backend API Port
    // - Local SQLite mode: 3000 (npm run dev:local)
    // - Wrangler mode: 8787 (wrangler dev)
    const apiPort = getEnv('VITE_API_PORT') || '3000';

    // Comma-separated list, read from process env only.
    // Examples:
    // - VITE_ALLOWED_HOSTS=true  (allow any host; not recommended)
    const raw = getEnv('VITE_ALLOWED_HOSTS');
    const allowAny = raw === 'true' || raw === '1' || raw === '*';
    const extraAllowedHosts = raw
        ? raw
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : [];

    const allowedHosts: true | string[] = allowAny ? true : ['localhost', '127.0.0.1', ...extraAllowedHosts];

    if (getEnv('VITE_DEBUG_CONFIG') === 'true') {
        // eslint-disable-next-line no-console
        console.log('[vite] resolved allowedHosts =', allowedHosts);
        // eslint-disable-next-line no-console
        console.log('[vite] resolved apiPort =', apiPort);
        // eslint-disable-next-line no-console
        console.log('[vite] VITE_ALLOWED_HOSTS(raw) =', raw || '(empty)');
    }

    return {
        plugins: [vue()],
        server: {
            host: true,
            allowedHosts,
            proxy: {
                '/api': {
                    target: 'http://localhost:' + apiPort,
                    changeOrigin: true,
                    rewrite: path => path.replace(/^\/api/, ''),
                },
                '/wechat': {
                    target: 'http://localhost:' + apiPort,
                    changeOrigin: true,
                },
            },
        },
        preview: {
            host: true,
            allowedHosts,
        },
    };
});
