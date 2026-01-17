export default {
    async fetch(request, env) {
        const url = new URL(request.url);

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
