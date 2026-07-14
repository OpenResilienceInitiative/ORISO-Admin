import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import type { CaseHandoverLogEntry } from '../../../types/caseHandoverLogs';
import { CaseHandoverLogsPage } from './index';

// GET .../service/users/case-handover/logs — `*` matches any configured origin.
const ENDPOINT = '*/service/users/case-handover/logs';

const ENTRIES: CaseHandoverLogEntry[] = [
    {
        requestId: 1,
        sessionId: 5012,
        status: 'GRANTED',
        auditOutcome: 'AUTO_APPROVED',
        reasonCode: 'VACATION',
        reasonLabel: 'Urlaubsvertretung',
        explanation: 'Regulärer Urlaub',
        clientConsentRequired: false,
        createdAt: '2026-06-01T09:12:00.000Z',
        requesterConsultantId: 'c-1',
        requesterName: 'Anna Muster',
        previousName: 'Ben Beispiel',
    },
    {
        requestId: 2,
        sessionId: 5019,
        status: 'PENDING_CLIENT_CONSENT',
        auditOutcome: null,
        reasonCode: 'SICKNESS',
        reasonLabel: 'Krankheitsfall',
        explanation: 'Kurzfristiger Ausfall',
        clientConsentRequired: true,
        createdAt: '2026-06-02T14:40:00.000Z',
        requesterConsultantId: 'c-2',
        requesterUsername: 'clara',
        previousUsername: 'daniel',
    },
    {
        requestId: 3,
        sessionId: 5024,
        status: 'DENIED',
        auditOutcome: 'REJECTED',
        reasonCode: 'OTHER',
        reasonLabel: 'Sonstiges',
        explanation: 'Nicht genehmigt',
        clientConsentRequired: false,
        createdAt: '2026-06-03T08:05:00.000Z',
        requesterConsultantId: 'c-3',
        requesterName: 'Erik Endres',
        previousName: null,
    },
];

const logsResponse = (entries: CaseHandoverLogEntry[]) =>
    HttpResponse.json({ data: entries, total: entries.length, page: 1, perPage: 20 });

const meta = {
    title: 'Organisms/Pages/Logs/CaseHandoverLogs',
    component: CaseHandoverLogsPage,
    parameters: { layout: 'fullscreen' },
    // Fresh React Query cache per story so the loading story is not served a sibling's cached data.
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
} satisfies Meta<typeof CaseHandoverLogsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated audit trail of case-handover requests. */
export const Filled: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => logsResponse(ENTRIES))] } },
};

/** No handover requests recorded yet — the table shows its empty state. */
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
