import * as React from 'react';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import de_DE from 'antd/es/locale/de_DE';
import { buildAdminAntdTheme } from '../src/theme/antdM3Theme';

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
        // WCAG 2.2 AA: run axe-core per story incl. the 2.2-specific rules and
        // flag violations as errors (visible in the A11y panel + storybook test).
        a11y: {
            test: 'error',
            config: {
                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
            },
        },
        controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
        options: {
            storySort: { order: ['Atoms', 'Molecules', 'Organisms', '*'] },
        },
    },
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
