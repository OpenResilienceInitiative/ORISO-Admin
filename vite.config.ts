import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgrPlugin from 'vite-plugin-svgr';
import eslintPlugin from 'vite-plugin-eslint';
import { visualizer } from 'rollup-plugin-visualizer';
import { existsSync, readFileSync } from 'node:fs';
import { authBffDevPlugin } from './vite.authBffPlugin';

// All React-dependent libraries must share one chunk. Splitting them (e.g. vendor-antd,
// vendor-draftjs, vendor-mui) causes init-order bugs: those bundles call React.createElement
// / React.Component before the react chunk has executed.
const vendorUiPattern =
    /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|antd|@ant-design|rc-|draft-js|@draft-js-plugins|immutable|@mui|@emotion|react-query|@tanstack)[\\/]/;

const vendorChunkMatchers: Array<{ chunk: string; pattern: RegExp }> = [
    { chunk: 'vendor-ui', pattern: vendorUiPattern },
    { chunk: 'vendor-dayjs', pattern: /[\\/]node_modules[\\/]dayjs[\\/]/ },
];

const resolveManualChunk = (id: string): string | undefined => {
    if (!id.includes('node_modules')) {
        return undefined;
    }

    const match = vendorChunkMatchers.find(({ pattern }) => pattern.test(id));
    return match?.chunk;
};

// https://vitejs.dev/config/
export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    const isAnalyze = mode === 'analyze';

    return defineConfig({
        base: process.env.BASE || '/admin',
        envPrefix: ['VITE_', 'REACT_APP_'],
        plugins: [
            authBffDevPlugin(),
            react(),
            viteTsconfigPaths(),
            svgrPlugin(),
            eslintPlugin({
                emitWarning: true,
                failOnWarning: false,
                emitError: true,
                failOnError: false,
                fix: false,
            }),
            isAnalyze &&
                visualizer({
                    filename: 'build/stats.html',
                    gzipSize: true,
                    brotliSize: true,
                    open: false,
                }),
        ].filter(Boolean),
        css: {
            preprocessorOptions: {
                less: {
                    javascriptEnabled: true,
                },
            },
        },
        build: {
            outDir: 'build',
            manifest: true,
            rollupOptions: {
                output: {
                    manualChunks: resolveManualChunk,
                },
            },
        },
        server: {
            host: '0.0.0.0',
            port: (process.env.VITE_PORT as unknown as number) || 9000,
        },
        configureServer(server) {
            const envPath = `${process.cwd()}/public/env.js`;
            // public/env.js is gitignored. Serve an in-memory fallback so the dev
            // server works on a fresh checkout without the file being present.
            const fallback = 'window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};\n';

            const base = (process.env.BASE || '/admin').replace(/\/$/, '');
            const runtimeEnvPath = `${base}/env.js`;
            server.middlewares.use((req, res, next) => {
                const pathname = (req.url ?? '').split('?')[0];
                if (pathname !== runtimeEnvPath) {
                    next();
                    return;
                }
                res.setHeader('Content-Type', 'application/javascript');
                res.end(existsSync(envPath) ? readFileSync(envPath) : fallback);
            });
        },
    });
};
