import * as React from 'react';
// antd's static APIs (message/notification/Modal.confirm) are silent no-ops
// under React 19 without this patch — the app imports it in src/index.tsx,
// stories exercising those APIs need it here too.
import '@ant-design/v5-patch-for-react-19';
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
        /*
         * Device sizes for the toolbar switcher. The two phone widths straddle
         * the app's own breakpoints: components branch at 767/768px (CSS and
         * `useIsDesktopLayout`), so 360 and 390 both land in the mobile branch
         * while 768 is the first tablet width that still gets the desktop
         * layout. Reviewing a story means checking it at Phone 390 and Laptop
         * 1280 at minimum.
         */
        viewport: {
            options: {
                phoneSmall: { name: 'Phone 360', styles: { width: '360px', height: '740px' } },
                phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
                tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
                laptop: { name: 'Laptop 1280', styles: { width: '1280px', height: '800px' } },
                desktop: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' } },
            },
        },
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
