import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

// ORISO-Admin Storybook (SB10 + Vite builder), mirrors the ORISO-Frontend recipe.
// @storybook/addon-mcp exposes the real Admin components+props to coding agents
// at http://localhost:6006/mcp. antd v4 styling needs less { javascriptEnabled }.
const config: StorybookConfig = {
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
    // addon-a11y runs axe (WCAG 2.2 AA) against each story in the a11y panel + component tests.
    // addon-docs renders the autodocs pages and the .mdx files under src/.
    // addon-vitest adds the sidebar test widget; it runs `vitest --project storybook`
    // (real Chromium) and reports interaction, a11y and coverage results in the UI.
    addons: [
        '@storybook/addon-mcp',
        '@storybook/addon-designs',
        '@storybook/addon-a11y',
        '@storybook/addon-docs',
        '@storybook/addon-vitest',
    ],
    framework: { name: '@storybook/react-vite', options: {} },
    core: { disableTelemetry: true },
    // Serve public/ so MSW's generated service worker (public/mockServiceWorker.js) is reachable.
    staticDirs: ['../public'],
    async viteFinal(cfg) {
        // Drop app-only plugins that are noisy or meaningless inside Storybook
        // (eslint linting, runtime-env middleware, auth BFF dev proxy, bundle
        // visualizer). Keep react / tsconfig-paths / svgr for resolution + JSX.
        const stripped = ['vite-plugin-eslint', 'runtime-env', 'auth-bff-dev', 'visualizer'];
        const plugins = (cfg.plugins ?? []).filter((p: any) => {
            const name = p && (Array.isArray(p) ? p[0]?.name : p.name);
            return !stripped.includes(name);
        });

        return mergeConfig(
            { ...cfg, plugins },
            {
                // SB serves from root, not the app's '/admin' base.
                base: '',
                define: { 'process.env': {} },
                resolve: {
                    // Force a single React instance — a 2nd copy breaks hooks
                    // ("Invalid hook call") and nulls every context.
                    dedupe: ['react', 'react-dom'],
                },
                css: {
                    preprocessorOptions: {
                        // antd v4 + App.less rely on inline JS in less.
                        less: { javascriptEnabled: true },
                    },
                },
                // Pre-bundle the docs blocks. Vite otherwise discovers them only
                // when the first .mdx / autodocs page is imported, re-optimizes
                // mid-flight, and every module request already in flight 404s
                // ("Failed to fetch dynamically imported module …/deps/
                // @storybook_addon-docs_n_@storybook_react-dom-shim.js"). In the
                // dev server that is a reload; in `vitest --project storybook` it
                // fails a handful of unrelated stories at random.
                optimizeDeps: {
                    include: ['@storybook/addon-docs > @storybook/react-dom-shim'],
                },
                build: { rollupOptions: { output: { manualChunks: undefined } } },
            },
        );
    },
};

export default config;
