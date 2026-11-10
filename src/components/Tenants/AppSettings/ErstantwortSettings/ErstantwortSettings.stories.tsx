import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { findPopup, popupsOf } from '../../../../test/storyPopups';
import { M3Button } from '../../../M3Button';
import { ErstantwortSettings } from './index';

const meta = {
    title: 'Tenants/Erstantwort/PublishValidation',
    component: ErstantwortSettings,
    parameters: {
        layout: 'padded',
        msw: {
            // No platform defaults in these synthetic tenants, so the read-only previews stay hidden.
            handlers: [http.get('*/service/useradmin/erstantwort/defaults', () => HttpResponse.json({ locale: 'de' }))],
        },
    },
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
        // The missing text is an event: one error pop-up titled "Erstantwort", not a box in the card.
        const popup = await findPopup(canvasElement, /mitlesen|read the conversation/i, 'error');
        await expect(popup).toHaveTextContent('Erstantwort');
        // "Ansehen" opens the mandatory section and moves focus into it.
        await userEvent.click(within(popup).getByRole('button', { name: 'Ansehen' }));
        const section = canvasElement.querySelector('#erstantwort-section-erstantwortWhoReadsAlong') as HTMLElement;
        await waitFor(() => expect(section.querySelector('button')).toHaveAttribute('aria-expanded', 'true'));
        await waitFor(() => expect(section.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    },
};

let tenantRequests = 0;
let tenantRecovered = false;
/**
 * T6: the Träger cannot be read - one error pop-up titled "Erstantwort" with "Erneut versuchen"; the tile keeps
 * quiet text. The retry asks again and the editors appear.
 */
export const LoadErrorRetry: Story = {
    args: { tenantId: '987660' },
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/useradmin/erstantwort/defaults', () => HttpResponse.json({ locale: 'de' })),
                http.get('*/service/tenantadmin/987660', () => {
                    tenantRequests += 1;
                    return tenantRecovered
                        ? HttpResponse.json({
                              id: 987660,
                              name: 'Synthetic tenant C',
                              settings: { activeLanguages: ['de'], extendedSettings: { languageFormal: true } },
                              content: {},
                          })
                        : new HttpResponse(null, { status: 500 });
                }),
            ],
        },
    },
    beforeEach: () => {
        tenantRequests = 0;
        tenantRecovered = false;
    },
    play: async ({ canvasElement }) => {
        const popup = await findPopup(canvasElement, 'Erstantwort', 'error');
        await expect(within(canvasElement).getByText('Dieser Bereich konnte nicht geladen werden.')).toBeVisible();
        const before = tenantRequests;
        tenantRecovered = true;
        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(tenantRequests).toBeGreaterThan(before));
        await expect(await within(canvasElement).findByRole('button', { name: /Veröffentlichen/ })).toBeInTheDocument();
        await waitFor(() => expect(popupsOf(canvasElement)).toHaveLength(0));
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
