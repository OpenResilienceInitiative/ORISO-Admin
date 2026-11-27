import { settlePendingRequests } from './pendingRequests';
import { storyRenderCleanup, type NativeStoryRenderer } from './storyRenderCleanup';
import { renderToCanvas as nativeRenderToCanvas } from '@storybook/react/entry-preview';
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
import type { SetupWorker } from 'msw/browser';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { beginStoryVerification, recordUnexpectedRequest } from './verification';
import { isProductRequest } from './verificationIntegrity';
import { a11yVerification } from './a11yVerification';
import { createSharedStoryHandlers } from './fixtures';
import { clearStoryQueryClients, createStoryQueryClient, releaseStoryQueryClient } from './queryClients';
import { buildAdminAntdTheme } from '../src/theme/antdM3Theme';
import { AdminEmpty } from '../src/components/AdminEmpty';
import { applyAdminTheme, clearAdminInvertedThemeTokens } from '../src/utils/applyAdminTheme';
import type { AdminContrast } from '../src/utils/theme/orisoScheme';

// Global Admin styling: antd v5 reset + app less/overrides. Mirrors src/App.tsx.
import 'antd/dist/reset.css';
import '../src/styles/App.less';
import '../src/app.css';
// Preview-only override: re-enable scrolling for stories taller than the iframe.
import './preview.css';
import { SnackbarHost, snackbar } from '../src/components/Snackbar';
// Initialise the shared i18next instance (side-effect import).
import '../src/i18n';

// Static modules and assets may load normally. Product requests must be backed
// by story-local fixtures; a failed worker must never create a false-green test:
// if `start()` rejects, the loader rejects and every story fails.
// The shared handlers are initial handlers, so they survive the per-story reset.
let storyWorker: SetupWorker | undefined;
const startStoryWorker = async (): Promise<SetupWorker> => {
    const worker = setupWorker(...createSharedStoryHandlers());
    await worker.start({
        onUnhandledRequest(request) {
            if (isProductRequest(request.url)) {
                recordUnexpectedRequest(request);
            }
        },
        serviceWorker: { url: new URL('mockServiceWorker.js', window.location.href).href },
    });
    storyWorker = worker;
    return worker;
};

/** The app-level snackbar host. A story that raises a pop-up shows it; leaving the story clears it. */
const StorySnackbarHost = () => {
    React.useEffect(() => () => snackbar.clear(), []);
    return <SnackbarHost />;
};

const StoryProviders = ({ children }: { children: React.ReactNode }) => {
    const [queryClient] = React.useState(createStoryQueryClient);
    React.useEffect(() => () => releaseStoryQueryClient(queryClient), [queryClient]);
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

type StoryScheme = 'light' | 'dark';
type StoryContrast = AdminContrast;

/**
 * The `scheme` and `contrast` globals: the personal display settings the app applies through
 * AdminDisplayProvider (applyAdminTheme on the root, `data-admin-personal-contrast`, and the antd
 * theme for the same scheme/contrast). `light` + `standard` (default) leave everything as before,
 * so stories that set their own tokens are not touched.
 */
const StoryScheme = ({
    scheme,
    contrast,
    children,
}: {
    scheme: StoryScheme;
    contrast: StoryContrast;
    children: React.ReactNode;
}) => {
    const personal = scheme === 'dark' || contrast !== 'standard';
    React.useLayoutEffect(() => {
        if (!personal) return undefined;
        const root = document.documentElement;
        applyAdminTheme(null, root, scheme, contrast);
        if (contrast !== 'standard') root.dataset.adminPersonalContrast = contrast;
        return () => {
            clearAdminInvertedThemeTokens();
            delete root.dataset.adminPersonalContrast;
        };
    }, [personal, scheme, contrast]);
    if (scheme !== 'dark') return <>{children}</>;
    return (
        <div
            style={{ minHeight: '100vh', padding: 24, background: 'var(--m3-surface)', color: 'var(--m3-on-surface)' }}
        >
            {children}
        </div>
    );
};

const readContrast = (value: unknown): StoryContrast => (value === 'medium' || value === 'high' ? value : 'standard');

const preview: Preview = {
    initialGlobals: { scheme: 'light', contrast: 'standard' },
    globalTypes: {
        scheme: {
            description: 'Admin colour scheme (personal display setting)',
            toolbar: {
                title: 'Scheme',
                icon: 'mirror',
                items: [
                    { value: 'light', title: 'Light' },
                    { value: 'dark', title: 'Dark' },
                ],
                dynamicTitle: true,
            },
        },
        contrast: {
            description: 'Admin contrast level (personal display setting)',
            toolbar: {
                title: 'Contrast',
                icon: 'contrast',
                items: [
                    { value: 'standard', title: 'Standard' },
                    { value: 'medium', title: 'Medium' },
                    { value: 'high', title: 'High' },
                ],
                dynamicTitle: true,
            },
        },
    },
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
                mobile1: { name: 'Mobile 320 (smallest)', styles: { width: '320px', height: '568px' } },
                phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
                tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
                responsive640: { name: 'Responsive 640', styles: { width: '640px', height: '900px' } },
                responsive1100: { name: 'Responsive 1100', styles: { width: '1100px', height: '900px' } },
                laptop: { name: 'Laptop 1280', styles: { width: '1280px', height: '800px' } },
                desktop: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' } },
            },
        },
    },
    loaders: [mswLoader(startStoryWorker)],
    async beforeEach(context) {
        if (import.meta.env.MODE === 'test') a11yVerification.begin(context);
        return beginStoryVerification(context.parameters.verification?.expectedErrors, async () => {
            const errors: unknown[] = [];
            try {
                await storyRenderCleanup.finish();
            } catch (error) {
                errors.push(error);
            }
            try {
                // The snackbar channel is module-level state: without this the persistent messages of one
                // story keep the four visible slots and the next story's toast waits in the queue.
                snackbar.clear();
            } catch (error) {
                errors.push(error);
            }
            try {
                await clearStoryQueryClients();
            } catch (error) {
                errors.push(error);
            }
            try {
                await settlePendingRequests();
            } catch (error) {
                errors.push(error);
            }
            try {
                storyWorker?.resetHandlers();
            } catch (error) {
                errors.push(error);
            }
            if (errors.length) throw new AggregateError(errors, errors.map(String).join('\n'));
        });
    },
    decorators: [
        (Story, context) => {
            const scheme: StoryScheme = context.globals.scheme === 'dark' ? 'dark' : 'light';
            const contrast = readContrast(context.globals.contrast);
            const personal = scheme === 'dark' || contrast !== 'standard';
            return (
                <StoryProviders>
                    <ConfigProvider
                        locale={de_DE}
                        theme={buildAdminAntdTheme(personal ? { scheme, contrast } : undefined)}
                        renderEmpty={() => <AdminEmpty />}
                    >
                        <AntdApp component={false}>
                            {/* `parameters.route` opens a story at an address, e.g. a list narrowed by `?q=`. */}
                            <MemoryRouter initialEntries={[context.parameters.route ?? '/']}>
                                <StoryScheme scheme={scheme} contrast={contrast}>
                                    <Story />
                                </StoryScheme>
                            </MemoryRouter>
                            {context.parameters.ownSnackbarHost ? null : <StorySnackbarHost />}
                        </AntdApp>
                    </ConfigProvider>
                </StoryProviders>
            );
        },
    ],
};

// Vitest only: retain the renderer's ACT-wrapped teardown so each story test can
// finish its own cleanup. The normal Storybook UI keeps the native renderer.
// Storybook 11 no longer allows setProjectAnnotations in the Vitest setup file.
if (import.meta.env.MODE === 'test') {
    const capturedNativeRenderer: NativeStoryRenderer = async (context, canvas) => {
        const teardown = await nativeRenderToCanvas(context, canvas);
        if (typeof teardown !== 'function') throw new Error('Native Storybook renderer returned no teardown');
        return storyRenderCleanup.retain(teardown);
    };
    preview.renderToCanvas = capturedNativeRenderer;
}

export default preview;
