import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import type { DeletionAuditLogEntry } from '../../../types/deletionAuditLogs';
import { DeletionAuditLogsPage } from './index';

// GET .../service/users/deletion-audit-logs — `*` matches any configured origin.
const ENDPOINT = '*/service/users/deletion-audit-logs';

const ENTRIES: DeletionAuditLogEntry[] = [
    {
        id: 4,
        actorId: null,
        actorRole: 'SYSTEM',
        targetType: 'CONSULTANT',
        targetId: '5e1f2c3a-9b0d-4c11-8a77-2f6d41c0aa01',
        tenantId: 1,
        outcome: 'EXECUTED',
        createDate: '2026-10-03T10:00:00.000Z',
    },
    {
        id: 3,
        actorId: 'a7d1c2b4-33f0-4e55-90a1-0c9e5d2b7f10',
        actorRole: 'PLATFORM_ADMIN',
        targetType: 'TENANT_ADMIN',
        targetId: '0b8e6d92-41aa-4d7e-b1c3-7a5f9e3c2d44',
        tenantId: 2,
        outcome: 'EXECUTED',
        createDate: '2026-10-02T09:30:00.000Z',
    },
    {
        id: 2,
        actorId: 'c2e9a0f1-6b3d-47a8-8e02-d41b7c5a9e63',
        actorRole: 'AGENCY_ADMIN',
        targetType: 'AGENCY_ADMIN',
        targetId: '9d4a7b10-52ce-4f68-a3b9-1e8c0d6f2a75',
        tenantId: 1,
        outcome: 'EXECUTED',
        createDate: '2026-10-01T15:12:00.000Z',
    },
    {
        id: 1,
        actorId: 'a7d1c2b4-33f0-4e55-90a1-0c9e5d2b7f10',
        actorRole: 'PLATFORM_ADMIN',
        targetType: 'CONSULTANT',
        targetId: '5e1f2c3a-9b0d-4c11-8a77-2f6d41c0aa01',
        tenantId: 1,
        outcome: 'SCHEDULED',
        createDate: '2026-10-01T10:00:00.000Z',
    },
];

const logsResponse = (entries: DeletionAuditLogEntry[]) =>
    HttpResponse.json({ data: entries, total: entries.length, page: 1, perPage: 20 });

const meta = {
    title: 'Organisms/Pages/Logs/DeletionAuditLogs',
    component: DeletionAuditLogsPage,
    parameters: { layout: 'fullscreen' },
    // Fresh React Query cache per story so the loading story is not served a sibling's cached data.
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
} satisfies Meta<typeof DeletionAuditLogsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A counsellor deletion from scheduling to execution, plus admin deletions. */
export const Filled: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => logsResponse(ENTRIES))] } },
};

/** Nothing deleted yet — the table shows its empty state. */
export const Empty: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => logsResponse([]))] } },
};

/** Request in flight — the table renders its loading spinner. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(ENDPOINT, async () => {
                    await delay('infinite');
                    return logsResponse([]);
                }),
            ],
        },
    },
};

/** Backend failure (500) — the page surfaces the error alert above the table. */
export const Error: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))] } },
};
