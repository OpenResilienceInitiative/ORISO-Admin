import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import type { AgencyInviteLinkDTO } from '../../api/invitelinks/invitelinks';
import { InviteLinksPage } from './index';

const LINKS_ENDPOINT = '*/service/useradmin/invitelinks';
const AGENCIES_ENDPOINT = '*/service/agencyadmin/agencies';

const LINKS: AgencyInviteLinkDTO[] = [
    {
        id: 1,
        token: 'abc123',
        tenantId: 1,
        agencyId: 101,
        createdByUserId: 'u-1',
        createdByUsername: 'admin',
        createDate: '2026-06-01T10:00:00.000Z',
        expiresAt: '2026-07-01T10:00:00.000Z',
        usedAt: null,
        usedBySessionId: null,
        status: 'ACTIVE',
    },
    {
        id: 2,
        token: 'def456',
        tenantId: 1,
        agencyId: 102,
        createdByUserId: 'u-1',
        createdByUsername: 'admin',
        createDate: '2026-05-20T09:30:00.000Z',
        expiresAt: '2026-05-27T09:30:00.000Z',
        usedAt: '2026-05-22T14:00:00.000Z',
        usedBySessionId: 900,
        status: 'USED',
    },
];

const linksResponse = (content: AgencyInviteLinkDTO[]) =>
    HttpResponse.json({ content, totalElements: content.length, totalPages: 1, page: 0, size: 20 });

// The agency select stays empty without a super-admin token; this handler just keeps the
// on-mount agencies request from falling through to the (nonexistent) network.
const emptyAgencies = http.get(AGENCIES_ENDPOINT, () => HttpResponse.json({ total: 0, _embedded: [] }));

const meta = {
    title: 'Organisms/Pages/Links/InviteLinks',
    component: InviteLinksPage,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
} satisfies Meta<typeof InviteLinksPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Existing invite links listed in the table. */
export const Filled: Story = {
    parameters: { msw: { handlers: [http.get(LINKS_ENDPOINT, () => linksResponse(LINKS)), emptyAgencies] } },
};

/** No invite links generated yet — the table shows its empty state. */
export const Empty: Story = {
    parameters: { msw: { handlers: [http.get(LINKS_ENDPOINT, () => linksResponse([])), emptyAgencies] } },
};

/** Links request in flight — the table renders its loading spinner. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(LINKS_ENDPOINT, async () => {
                    await delay('infinite');
                    return linksResponse([]);
                }),
                emptyAgencies,
            ],
        },
    },
};

/** Backend failure (500) — the load fails and the table stays empty. */
export const Error: Story = {
    parameters: {
        msw: { handlers: [http.get(LINKS_ENDPOINT, () => new HttpResponse(null, { status: 500 })), emptyAgencies] },
    },
};
