export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Reverse-proxy backend endpoints that must be reachable by third parties (e.g. WeChat servers).
        // In production, your frontend may be deployed as a static site/worker, while the backend is a separate Worker.
        // Requests initiated by WeChat will NOT go through the browser and thus won't use VITE_API_BASE_URL.
        //
        // Configure this var on the `tjuecard-web` Worker (runtime variables):
        // - VITE_API_BASE_URL (e.g. "https://xxxx.com")
        const backendOrigin = env?.VITE_API_BASE_URL;
        const pathname = url.pathname || '/';
        const isWeChatPath = pathname === '/wechat' || pathname.startsWith('/wechat/');

        // Only proxy WeChat callbacks (server-to-server). Keep all other paths unchanged.
        if (isWeChatPath) {
            if (!backendOrigin) {
                return new Response('Missing VITE_API_BASE_URL in Worker runtime variables', {
                    headers: { 'content-type': 'text/plain; charset=utf-8' },
                    status: 502,
                });
            }

            const targetBase = new URL(backendOrigin);
            const proxiedUrl = new URL(request.url);

            // Rebase to backend origin (keep path + query intact).
            proxiedUrl.protocol = targetBase.protocol;
            proxiedUrl.username = targetBase.username;
            proxiedUrl.password = targetBase.password;
            proxiedUrl.host = targetBase.host;

            // Preserve method/headers/body, but avoid forwarding the original Host header.
            const headers = new Headers(request.headers);
            headers.delete('host');

            const method = request.method || 'GET';
            const hasBody = method !== 'GET' && method !== 'HEAD';

            return fetch(proxiedUrl.toString(), {
                body: hasBody ? request.body : undefined,
                headers,
                method,
                redirect: 'follow',
            });
        }

        // Try to fetch the requested asset
        const response = await env.ASSETS.fetch(request);

        // If the asset is not found (404), serve index.html for SPA routing
        // Exclude API paths if necessary (though they should be handled by backend routing if separated)
        if (response.status === 404 && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/wechat')) {
            const indexRequest = new Request(new URL('/index.html', request.url), request);
            return env.ASSETS.fetch(indexRequest);
        }

        return response;
    },
};
