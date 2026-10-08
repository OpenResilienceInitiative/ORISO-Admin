import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { within, userEvent, screen, expect } from 'storybook/test';
import { GrantConsultantIdentityModal } from './index';

// The modal loads its agency options from GET .../service/agencyadmin/agencies on mount.
// A leading `*` matches any origin so the handler works regardless of the configured host.
const AGENCY_ENDPOINT = '*/service/agencyadmin/agencies';

const topic = (id: number, name: string) => ({ id, name, description: '', internalIdentifier: null, status: 'ACTIVE' });

// Nord offers one topic (auto-assigned), Mitte several (must choose), West none (grant blocked).
const AGENCIES = [
    {
        id: 1,
        name: 'Beratungsstelle Nord',
        city: 'Hamburg',
        postcode: '20095',
        deleteDate: null,
        tenantId: 1,
        topics: [topic(10, 'Suchtberatung')],
    },
    {
        id: 2,
        name: 'Jugendberatung Mitte',
        city: 'Berlin',
        postcode: '10115',
        deleteDate: null,
        tenantId: 1,
        topics: [topic(11, 'Schuldnerberatung'), topic(12, 'Familienberatung')],
    },
    { id: 3, name: 'Familienhilfe West', city: 'Köln', postcode: '50667', deleteDate: null, tenantId: 1, topics: [] },
];

// getAgencyData() expects a HAL-style body: `{ total, _embedded: [...] }` (see removeEmbedded).
const agenciesResponse = (list: typeof AGENCIES) => HttpResponse.json({ total: list.length, _embedded: list });

/** Opens the modal so the agencies multi-select (fed by the mocked request) is visible. */
const openModal = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button'));
    // antd Modal renders through a portal on document.body, so query the whole screen.
    await screen.findByRole('dialog');
};

/** Opens the modal and picks one Beratungsstelle, so the topic step for it becomes visible. */
const pickAgency =
    (agencyName: string) =>
    async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        await openModal({ canvasElement });
        await userEvent.click(screen.getAllByRole('combobox')[0]);
        await userEvent.click(await screen.findByRole('option', { name: new RegExp(agencyName) }));
    };

const meta = {
    title: 'Organisms/GrantConsultantIdentityModal',
    component: GrantConsultantIdentityModal,
    parameters: { layout: 'padded' },
    // A fresh React Query cache per story: the agency query key is identical across stories,
    // so without isolation the "loading" story would be served the cached result of another.
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
    args: {
        adminId: 'admin-1',
        onSuccess: () => {},
    },
} satisfies Meta<typeof GrantConsultantIdentityModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Agencies loaded: the multi-select offers the tenant's active agencies. */
export const AgenciesLoaded: Story = {
    parameters: {
        msw: { handlers: [http.get(AGENCY_ENDPOINT, () => agenciesResponse(AGENCIES))] },
    },
    play: openModal,
};

/** Loading: the request never resolves, so the select renders in its loading state. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(AGENCY_ENDPOINT, async () => {
                    await delay('infinite');
                    return agenciesResponse([]);
                }),
            ],
        },
    },
    play: openModal,
};

/** Empty: the tenant has no agencies, so the select renders with no options. */
export const EmptyAgencies: Story = {
    parameters: {
        msw: { handlers: [http.get(AGENCY_ENDPOINT, () => agenciesResponse([]))] },
    },
    play: openModal,
};

/**
 * Error: the agencies request fails (500). `getAgencyData` shows an error toast and the
 * query yields no data, so the select degrades to an empty (no-options) state.
 */
export const Error: Story = {
    parameters: {
        msw: { handlers: [http.get(AGENCY_ENDPOINT, () => new HttpResponse(null, { status: 500 }))] },
    },
    play: openModal,
};

/** One topic at the Beratungsstelle: it is assigned automatically and the field is locked. */
export const SingleTopicAssigned: Story = {
    parameters: {
        msw: { handlers: [http.get(AGENCY_ENDPOINT, () => agenciesResponse(AGENCIES))] },
    },
    play: async (context) => {
        await pickAgency('Beratungsstelle Nord')(context);
        await expect(await screen.findByText(/nur ein Thema|only one topic/)).toBeInTheDocument();
    },
};

/** Several topics: the admin picks the ones they counsel in; "Anlegen" validates at least one. */
export const SeveralTopicsToChoose: Story = {
    parameters: {
        msw: { handlers: [http.get(AGENCY_ENDPOINT, () => agenciesResponse(AGENCIES))] },
    },
    play: async (context) => {
        await pickAgency('Jugendberatung Mitte')(context);
        await expect(screen.getAllByRole('combobox')).toHaveLength(2);
    },
};

/** No topic at the Beratungsstelle: the dialog explains it and the grant is blocked. */
export const NoTopicAtAgency: Story = {
    parameters: {
        msw: { handlers: [http.get(AGENCY_ENDPOINT, () => agenciesResponse(AGENCIES))] },
    },
    play: async (context) => {
        await pickAgency('Familienhilfe West')(context);
        await expect(await screen.findByRole('alert')).toBeInTheDocument();
    },
};
