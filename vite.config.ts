import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgrPlugin from 'vite-plugin-svgr';
import eslintPlugin from 'vite-plugin-eslint';
import { existsSync, readFileSync } from 'node:fs';

// https://vitejs.dev/config/
export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

    return defineConfig({
        base: process.env.BASE || '/admin',
        envPrefix: ['VITE_', 'REACT_APP_'],
        plugins: [
            react(),
            viteTsconfigPaths(),
            svgrPlugin(),
            eslintPlugin({
                emitWarning: true,
                failOnWarning: false,
                emitError: true,
                failOnError: true,
                fix: false,
            }),
        ],
        css: {
            preprocessorOptions: {
                less: {
                    javascriptEnabled: true,
                },
            },
        },
        build: {
            outDir: 'build',
        },
        server: {
            host: '0.0.0.0',
            port: (process.env.VITE_PORT as unknown as number) || 9000,
        },
        configureServer(server) {
            const envPath = `${process.cwd()}/public/env.js`;

            server.middlewares.use('/admin/env.js', (_req, res, next) => {
                if (!existsSync(envPath)) {
                    next();
                    return;
                }
                res.setHeader('Content-Type', 'application/javascript');
                res.end(readFileSync(envPath));
            });
        },
    });
};
