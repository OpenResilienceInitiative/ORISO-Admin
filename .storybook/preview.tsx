import * as React from 'react';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import de_DE from 'antd/es/locale/de_DE';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { buildAdminAntdTheme } from '../src/theme/antdM3Theme';

// Global Admin styling: antd v5 reset + app less/overrides. Mirrors src/App.tsx.
import 'antd/dist/reset.css';
import '../src/styles/App.less';
import '../src/app.css';
// Initialise the shared i18next instance (side-effect import).
import '../src/i18n';

// Start the MSW request-mocking worker. Stories opt in with `parameters.msw.handlers`;
// everything else passes through untouched (`onUnhandledRequest: 'bypass'`).
initialize({ onUnhandledRequest: 'bypass' });

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const preview: Preview = {
    parameters: {
        controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
        options: {
            storySort: { order: ['Atoms', 'Molecules', 'Organisms', '*'] },
        },
    },
    loaders: [mswLoader],
    decorators: [
        (Story) => (
            <QueryClientProvider client={queryClient}>
                <ConfigProvider locale={de_DE} theme={buildAdminAntdTheme()}>
                    <MemoryRouter>
                        <Story />
                    </MemoryRouter>
                </ConfigProvider>
            </QueryClientProvider>
        ),
    ],
};

export default preview;
