import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const reactJsxRuntime = fileURLToPath(new URL('./node_modules/react/jsx-runtime.js', import.meta.url));
const reactJsxDevRuntime = fileURLToPath(new URL('./node_modules/react/jsx-dev-runtime.js', import.meta.url));

// https://vitest.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'react/jsx-dev-runtime': reactJsxDevRuntime,
            'react/jsx-runtime': reactJsxRuntime,
        },
    },
    test: {
        environment: 'jsdom',
        exclude: [...configDefaults.exclude, 'cypress/**'],
        globals: true,
        server: {
            deps: {
                inline: [/node_modules\/@mui\//],
            },
        },
        setupFiles: './src/test/setup.ts',
    },
});
