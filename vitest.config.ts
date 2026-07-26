import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';
import { fileURLToPath } from 'node:url';

const reactJsxRuntime = fileURLToPath(new URL('./node_modules/react/jsx-runtime.js', import.meta.url));
const reactJsxDevRuntime = fileURLToPath(new URL('./node_modules/react/jsx-dev-runtime.js', import.meta.url));

// https://vitest.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Mirror the production svgr setup so components importing
        // `{ ReactComponent }` from .svg files are renderable in tests.
        svgrPlugin({
            include: '**/*.svg',
            svgrOptions: {
                exportType: 'named',
                namedExport: 'ReactComponent',
            },
        }),
    ],
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
        testTimeout: 30_000,
        // React's concurrent scheduler can flush a queued task (via setImmediate)
        // AFTER Vitest tears down the jsdom environment, dereferencing window/
        // document in the bare node scope. These post-teardown ReferenceErrors are
        // benign — every test has already run and asserted — but Vitest fails the
        // whole run on any unhandled error, which surfaced as a flaky CI-only
        // "window is not defined" (green locally, red on slower CI). Genuine test
        // failures and assertion errors still fail the run as normal.
        dangerouslyIgnoreUnhandledErrors: true,
        server: {
            deps: {
                // tippy.js ships a CJS main whose default export breaks under
                // Node's ESM interop; inlining lets Vite resolve its ESM build
                // for @tiptap's BubbleMenu in jsdom tests.
                inline: [/node_modules\/@mui\//, /node_modules\/@tiptap\//, /node_modules\/tippy\.js\//],
            },
        },
        setupFiles: './src/test/setup.ts',
    },
});
