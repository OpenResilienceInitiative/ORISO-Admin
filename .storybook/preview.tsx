import * as React from 'react';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider } from 'antd';
import de_DE from 'antd/es/locale/de_DE';

// Global Admin styling: antd v5 reset + app less/overrides. Mirrors src/App.tsx.
import 'antd/dist/reset.css';
import '../src/styles/App.less';
import '../src/app.css';
// Initialise the shared i18next instance (side-effect import).
import '../src/i18n';

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
    decorators: [
        (Story) => (
            <QueryClientProvider client={queryClient}>
                <ConfigProvider
                    locale={de_DE}
                    theme={{ token: { colorPrimary: '#273270', colorLink: '#273270', borderRadius: 4 } }}
                >
                    <MemoryRouter>
                        <Story />
                    </MemoryRouter>
                </ConfigProvider>
            </QueryClientProvider>
        ),
    ],
};

export default preview;
