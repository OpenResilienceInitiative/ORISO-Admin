import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { fileURLToPath } from 'node:url';

const reactJsxRuntime = fileURLToPath(new URL('./node_modules/react/jsx-runtime.js', import.meta.url));
const reactJsxDevRuntime = fileURLToPath(new URL('./node_modules/react/jsx-dev-runtime.js', import.meta.url));

// Two Vitest projects, run separately (see package.json scripts):
//   `unit`      — jsdom, src/**/*.test.tsx. This is what `npm test` and CI run.
//   `storybook` — every story executed in a real Chromium via Vitest browser
//                 mode. Renders the story, runs its `play` function, and asserts
//                 axe (WCAG 2.2 AA) via the `a11y.test: 'error'` parameter set in
//                 .storybook/preview.tsx. Needs Playwright browsers installed
//                 (`npx playwright install chromium`), so it stays out of the
//                 default `npm test` and gets its own CI job.
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
        coverage: {
            provider: 'v8',
            // `text` for the terminal, `html` for humans, `json-summary` for the
            // coverage widget inside Storybook's sidebar.
            reporter: ['text', 'html', 'json-summary'],
            reportsDirectory: './coverage',
            // Measure product code only — stories, mocks and generated types
            // would otherwise dominate the percentage and make it meaningless.
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.stories.{ts,tsx}',
                'src/**/*.test.{ts,tsx}',
                'src/**/__mocks__/**',
                'src/test/**',
                'src/types/**',
                'src/**/*.d.ts',
            ],
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
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
            },
            {
                extends: true,
                plugins: [
                    storybookTest({
                        configDir: '.storybook',
                        // Docs pages are not tests. Keeping them out also keeps
                        // @storybook/addon-docs out of the dependency graph, so
                        // Vite cannot discover it mid-run and re-optimize (see
                        // optimizeDeps below).
                        disableAddonDocs: true,
                    }),
                ],
                optimizeDeps: {
                    // Vitest imports story files dynamically, so Vite's initial
                    // dependency crawl never sees them: the 40th story file
                    // discovers a new dependency, Vite re-optimizes, the browser
                    // hash changes, and every module request already in flight
                    // 404s ("Failed to import test file …", "Vitest failed to
                    // find the runner"). That looked like random unrelated
                    // stories failing on a cold node_modules/.cache. Listing the
                    // stories as crawl entries makes the optimizer discover
                    // everything before the first test runs.
                    entries: ['.storybook/preview.tsx', 'src/**/*.stories.@(ts|tsx)', 'src/**/*.mdx'],
                    // The crawl above still misses these: they are reached only
                    // through app-level modules a few stories import, past the
                    // point where the scanner stops. `DEBUG=vite:deps` reports
                    // them as "new dependencies found" mid-run. Listing them
                    // explicitly is what actually keeps the run stable.
                    include: [
                        '@storybook/addon-docs > @storybook/react-dom-shim',
                        'react-app-polyfill/stable',
                        '@ant-design/v5-patch-for-react-19',
                        'antd/es/locale/en_GB',
                        '@tanstack/react-query-devtools',
                        '@opentelemetry/api',
                        '@opentelemetry/resources',
                        '@opentelemetry/sdk-metrics',
                        '@opentelemetry/exporter-metrics-otlp-http',
                    ],
                },
                test: {
                    name: 'storybook',
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({
                            contextOptions: {
                                // `src/i18n.ts` derives the initial language from
                                // navigator.language and falls back to English.
                                // Headless Chromium reports en-US, so without this
                                // every play function asserting a German label
                                // ("Weitere Aktionen", "Sprache wählen") would fail
                                // here while passing in a reviewer's German browser.
                                // Pin the locale so the suite tests the product's
                                // primary language, not the machine it runs on.
                                locale: 'de-DE',
                                // Same argument for dates: a story rendering a
                                // timestamp must not change meaning between a CI
                                // runner in UTC and a laptop in CET.
                                timezoneId: 'Europe/Berlin',
                            },
                        }),
                        instances: [{ browser: 'chromium' }],
                    },
                    setupFiles: ['.storybook/vitest.setup.ts'],
                },
            },
        ],
    },
});
