import * as React from 'react';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import de_DE from 'antd/es/locale/de_DE';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { buildAdminAntdTheme } from '../src/theme/antdM3Theme';
import { AdminEmpty } from '../src/components/AdminEmpty';

// Global Admin styling: antd v5 reset + app less/overrides. Mirrors src/App.tsx.
import 'antd/dist/reset.css';
import '../src/styles/App.less';
import '../src/app.css';
// Initialise the shared i18next instance (side-effect import).
import '../src/i18n';

// Start the MSW request-mocking worker. Stories opt in with `parameters.msw.handlers`;
// everything else passes through untouched (`onUnhandledRequest: 'bypass'`).
// The worker URL must be resolved relative to the preview iframe: MSW's default is the
// absolute '/mockServiceWorker.js', which on a sub-path deployment (Pre-Dev serves this
// build under /storybook-admin/) hits the app's SPA fallback and returns text/html —
// registration then fails and *every* story renders as an error page instead.
initialize({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: new URL('mockServiceWorker.js', window.location.href).href },
});

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const preview: Preview = {
    parameters: {
        // WCAG 2.2 AA: run axe-core (incl. the 2.2-specific rules) against each
        // story and flag violations as errors (A11y panel + storybook test-runner).
        a11y: {
            test: 'error',
            options: { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        },
        controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
        options: {
            storySort: { order: ['Atoms', 'Molecules', 'Organisms', '*'] },
        },
    },
    loaders: [mswLoader],
    decorators: [
        (Story) => (
            <QueryClientProvider client={queryClient}>
                <ConfigProvider locale={de_DE} theme={buildAdminAntdTheme()} renderEmpty={() => <AdminEmpty />}>
                    <MemoryRouter>
                        <Story />
                    </MemoryRouter>
                </ConfigProvider>
            </QueryClientProvider>
        ),
    ],
};

export default preview;
