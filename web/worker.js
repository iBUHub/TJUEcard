export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname.startsWith('/api/electricity/')) {
            const apiBaseUrl = env.VITE_API_BASE_URL?.trim();
            if (!apiBaseUrl) {
                return new Response('VITE_API_BASE_URL is not configured', { status: 502 });
            }

            const apiUrl = new URL(apiBaseUrl);
            const apiBasePath = apiUrl.pathname.replace(/\/$/, '');
            const apiPath = url.pathname.replace(/^\/api/, '');
            apiUrl.pathname = `${apiBasePath}${apiPath}`;
            apiUrl.search = url.search;

            return fetch(new Request(apiUrl, request));
        }

        // Try to fetch the requested asset
        const response = await env.ASSETS.fetch(request);

        // If the asset is not found (404), serve index.html for SPA routing
        // Exclude API paths if necessary (though they should be handled by backend routing if separated)
        if (response.status === 404 && !url.pathname.startsWith('/api')) {
            const indexRequest = new Request(new URL('/index.html', request.url), request);
            return env.ASSETS.fetch(indexRequest);
        }

        return response;
    },
};
