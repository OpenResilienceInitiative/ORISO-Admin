import type { Plugin } from 'vite';
import { createAuthBffHandler, AUTH_BFF_ROUTE_PATTERN } from './scripts/auth-bff-handlers.mjs';

export const authBffDevPlugin = (): Plugin => ({
    name: 'oriso-admin-auth-bff',
    configureServer(server) {
        const handler = createAuthBffHandler();

        server.middlewares.use((request, response, next) => {
            const url = request.url ?? '';
            if (!AUTH_BFF_ROUTE_PATTERN.test(url.split('?')[0])) {
                next();
                return;
            }

            handler(request, response).catch((error) => {
                response.statusCode = 500;
                response.end(error instanceof Error ? error.message : 'Auth BFF error');
            });
        });
    },
});
