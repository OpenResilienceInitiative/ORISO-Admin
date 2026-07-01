import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

// ORISO-Admin Storybook (SB10 + Vite builder), mirrors the ORISO-Frontend recipe.
// @storybook/addon-mcp exposes the real Admin components+props to coding agents
// at http://localhost:6006/mcp. antd v4 styling needs less { javascriptEnabled }.
const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-mcp', '@storybook/addon-designs'],
    framework: { name: '@storybook/react-vite', options: {} },
    core: { disableTelemetry: true },
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
                build: { rollupOptions: { output: { manualChunks: undefined } } },
            }
        );
    },
};

export default config;
