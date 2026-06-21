import http from 'node:http';
import { createAuthBffHandler } from './auth-bff-handlers.mjs';

const port = Number(process.env.AUTH_BFF_PORT || 3001);
const handler = createAuthBffHandler();

const server = http.createServer((request, response) => {
    handler(request, response).catch((error) => {
        response.statusCode = 500;
        response.end(error instanceof Error ? error.message : 'Auth BFF error');
    });
});

server.listen(port, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`Auth BFF listening on port ${port}`);
});
