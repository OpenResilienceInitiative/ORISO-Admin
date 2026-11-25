import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, within } from 'storybook/test';
import { AGENCY_ERSTANTWORT_QUERY_KEY } from '../../../../../hooks/useAgencyErstantwort.hook';
import { ERSTANTWORT_DEFAULTS_QUERY_KEY } from '../../../../../hooks/useErstantwortDefaults.hook';
import { AgencyErstantwortSettings } from './index';

/** Synthetic centre: its own greeting; who reads along is left to the Träger. */
const centreTexts = {
    erstantwortGreeting: { de: '<p>Willkommen bei der Jugendberatung Springfield. Schön, dass Sie da sind.</p>' },
};

const meta = {
    title: 'Settings/Beratungsstelle/Einführung Ratsuchende',
    id: 'agency-erstantwort',
    component: AgencyErstantwortSettings,
    parameters: { layout: 'padded' },
    args: {
        agencyId: '4711',
        activeLanguages: ['de', 'en'],
        languageFormal: true,
        traegerContent: {
            erstantwortWhoReadsAlong: { de: '<p>Ihre Nachricht lesen die Fachkräfte unseres Beratungsteams.</p>' },
        },
    },
    decorators: [
        (Story) => {
            // Seeded: the authenticated fetch wrapper has no token in Storybook.
            const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
            client.setQueryData([AGENCY_ERSTANTWORT_QUERY_KEY, '4711'], centreTexts);
            client.setQueryData([ERSTANTWORT_DEFAULTS_QUERY_KEY, false], {
                locale: 'de',
                greeting: 'Schön, dass Sie sich gemeldet haben. Ihre Nachricht ist bei uns angekommen.',
                closing: 'Bis bald — wir melden uns bei Ihnen.',
                emergencyNumbers: 'Telefonseelsorge 0800 111 0 111',
            });
            return (
                <QueryClientProvider client={client}>
                    <Story />
                </QueryClientProvider>
            );
        },
    ],
} satisfies Meta<typeof AgencyErstantwortSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CentreOverride: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/Jugendberatung Springfield/)).toBeInTheDocument();
    },
};

export const ReadOnly: Story = { args: { readOnly: true } };
