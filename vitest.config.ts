import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            // svgr-style imports; the build uses vite-plugin-svgr instead.
            { find: /^.+\.svg$/, replacement: new URL('./src/test/svgStub.tsx', import.meta.url).pathname },
        ],
    },
    test: {
        include: ['src/**/*.test.{ts,tsx}'],
        setupFiles: ['src/test/setup.ts'],
        server: {
            deps: {
                // Ships ESM with extensionless internal imports; must be
                // transformed by vite instead of loaded natively by node.
                inline: ['@material/material-color-utilities'],
            },
        },
    },
});
