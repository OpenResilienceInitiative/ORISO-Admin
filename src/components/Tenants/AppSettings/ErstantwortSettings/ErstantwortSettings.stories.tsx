import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within } from 'storybook/test';
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
        await expect(greeting.querySelector('h1, strong')).toBeNull();
        await userEvent.click(await canvas.findByRole('button', { name: /Veröffentlichen|Publish/i }));
        await expect(canvas.getByRole('alert')).toBeVisible();
        await expect(canvas.getByRole('alert')).toHaveTextContent(/Nachricht|message/i);
    },
};
