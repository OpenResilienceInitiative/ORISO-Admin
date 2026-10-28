import { storyRenderCleanup } from './storyRenderCleanup';
import {
    queryLifetimeEnabled,
    observeQueryBoundary,
    observeQueryMSW,
    observeQueryUnhandled,
} from '../scripts/query-lifetime-diagnostic';
import * as React from 'react';
// antd's static APIs (message/notification/Modal.confirm) are silent no-ops
// under React 19 without this patch — the app imports it in src/index.tsx,
// stories exercising those APIs need it here too.
import '@ant-design/v5-patch-for-react-19';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import de_DE from 'antd/es/locale/de_DE';
import { getWorker, initialize, mswLoader } from 'msw-storybook-addon';
import { adminMessageConfig } from '../src/constants/adminMessageConfig';
import { TransportFeedbackBridge } from '../src/components/TransportFeedbackBridge';
import { beginStoryVerification, recordUnexpectedRequest } from './verification';
import { isProductRequest } from './verificationIntegrity';
import { a11yVerification } from './a11yVerification';
import { createSharedStoryHandlers } from './fixtures';
import { clearStoryQueryClients, createStoryQueryClient, releaseStoryQueryClient } from './queryClients';
import { buildAdminAntdTheme } from '../src/theme/antdM3Theme';
import { AdminEmpty } from '../src/components/AdminEmpty';

// Global Admin styling: antd v5 reset + app less/overrides. Mirrors src/App.tsx.
import 'antd/dist/reset.css';
import '../src/styles/App.less';
import '../src/app.css';
// Preview-only override: re-enable scrolling for stories taller than the iframe.
import './preview.css';
// Initialise the shared i18next instance (side-effect import).
import '../src/i18n';

// Static modules and assets may load normally. Product requests must be backed
// by story-local fixtures; a failed worker must never create a false-green test.
initialize(
    {
        onUnhandledRequest(request) {
            if (isProductRequest(request.url)) {
                observeQueryUnhandled(() => request);
                recordUnexpectedRequest(request);
            }
        },
        serviceWorker: { url: new URL('mockServiceWorker.js', window.location.href).href },
    },
    createSharedStoryHandlers(),
);

// Temporary exact-selection observer. Original worker, handlers and error policy stay active.
if (queryLifetimeEnabled()) {
    (['request:start', 'request:match', 'request:unhandled', 'request:end'] as const).forEach((phase) => {
        getWorker().events.on(phase, (event) => observeQueryMSW(phase, event));
    });
}

const StoryProviders = ({ children }: { children: React.ReactNode }) => {
    const [queryClient] = React.useState(createStoryQueryClient);
    React.useEffect(() => () => releaseStoryQueryClient(queryClient), [queryClient]);
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

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
                responsive640: { name: 'Responsive 640', styles: { width: '640px', height: '900px' } },
                responsive1100: { name: 'Responsive 1100', styles: { width: '1100px', height: '900px' } },
                laptop: { name: 'Laptop 1280', styles: { width: '1280px', height: '800px' } },
                desktop: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' } },
            },
        },
        options: {
            storySort: { order: ['Atoms', 'Molecules', 'Organisms', '*'] },
        },
    },
    loaders: [mswLoader],
    async beforeEach(context) {
        if (import.meta.env.MODE === 'test') a11yVerification.begin(context);
        return beginStoryVerification(context.parameters.verification?.expectedErrors, async () => {
            const errors: unknown[] = [];
            try {
                observeQueryBoundary(() => ({ ownerId: context.id, phase: 'before-native-teardown' }));
                await storyRenderCleanup.finish();
                observeQueryBoundary(() => ({ ownerId: context.id, phase: 'after-native-teardown' }));
            } catch (error) {
                errors.push(error);
            }
            try {
                observeQueryBoundary(() => ({ ownerId: context.id, phase: 'before-cancel-clear' }));
                await clearStoryQueryClients();
                observeQueryBoundary(() => ({ ownerId: context.id, phase: 'after-cancel-clear' }));
            } catch (error) {
                errors.push(error);
            }
            try {
                observeQueryBoundary(() => ({ ownerId: context.id, phase: 'before-reset-handlers' }));
                getWorker().resetHandlers();
                observeQueryBoundary(() => ({ ownerId: context.id, phase: 'after-reset-handlers' }));
            } catch (error) {
                errors.push(error);
            }
            if (errors.length) throw new AggregateError(errors, errors.map(String).join('\n'));
        });
    },
    decorators: [
        (Story) => (
            <StoryProviders>
                <ConfigProvider locale={de_DE} theme={buildAdminAntdTheme()} renderEmpty={() => <AdminEmpty />}>
                    <AntdApp component={false} message={adminMessageConfig}>
                        <TransportFeedbackBridge />
                        <MemoryRouter>
                            <Story />
                        </MemoryRouter>
                    </AntdApp>
                </ConfigProvider>
            </StoryProviders>
        ),
    ],
};

export default preview;
