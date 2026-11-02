import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within } from 'storybook/test';
import { M3Button } from '../../../M3Button';
import { ErstantwortSettings } from './index';

const meta = {
    title: 'Tenants/Erstantwort/PublishValidation',
    component: ErstantwortSettings,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof ErstantwortSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
client.setQueryData(['TENANT', 987654], {
    id: 987654,
    name: 'Synthetic counselling centre',
    settings: { activeLanguages: ['de'], extendedSettings: { languageFormal: true } },
    content: {
        erstantwortGreeting: { de: '<p>Willkommen bei unserer Beratung.</p>' },
        erstantwortResponseDeadlineDays: 0,
    },
});

/** The real container and editors; local synthetic query data, no service acceptance claim. */
export const MissingDisclosure: Story = {
    args: { tenantId: '987654' },
    decorators: [
        (Story) => (
            <QueryClientProvider client={client}>
                <Story />
            </QueryClientProvider>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const greeting = await canvas.findByRole('textbox', { name: /Begrüßung|Greeting/i });
        await userEvent.clear(greeting);
        await userEvent.type(greeting, '# Heading stays plain');
        await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
        await userEvent.type(greeting, 'Second paragraph');
        await expect(greeting.querySelector('h1, strong, br')).toBeNull();
        await expect(greeting.querySelectorAll('p')).toHaveLength(2);
        await userEvent.click(await canvas.findByRole('button', { name: /Veröffentlichen|Publish/i }));
        await expect(canvas.getByRole('alert')).toBeVisible();
        await expect(canvas.getByRole('alert')).toHaveTextContent(/Nachricht|message/i);
    },
};

client.setQueryData(['TENANT', 987655], {
    id: 987655,
    name: 'Synthetic tenant B',
    settings: { activeLanguages: ['de'], extendedSettings: { languageFormal: true } },
    content: {
        erstantwortGreeting: { de: '<p>Stored text for tenant B</p>' },
        erstantwortWhoReadsAlong: { de: '<p>Tenant B counselling team</p>' },
    },
});

const CachedTenantNavigation = () => {
    const [tenantId, setTenantId] = useState('987654');
    return (
        <QueryClientProvider client={client}>
            <M3Button onClick={() => setTenantId('987655')}>View cached tenant B</M3Button>
            <ErstantwortSettings tenantId={tenantId} />
        </QueryClientProvider>
    );
};

/** The real keyed container with both synthetic tenants already cached. */
export const CachedTenantSwitch: Story = {
    args: { tenantId: '987654' },
    render: () => <CachedTenantNavigation />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const greeting = await canvas.findByRole('textbox', { name: /Begrüßung|Greeting/i });
        await userEvent.clear(greeting);
        await userEvent.type(greeting, 'Private draft for tenant A');
        await userEvent.click(canvas.getByRole('button', { name: 'View cached tenant B' }));
        await expect(canvas.getByRole('textbox', { name: /Begrüßung|Greeting/i })).toHaveTextContent(
            'Stored text for tenant B',
        );
        await expect(canvas.queryByText('Private draft for tenant A')).not.toBeInTheDocument();
    },
};
