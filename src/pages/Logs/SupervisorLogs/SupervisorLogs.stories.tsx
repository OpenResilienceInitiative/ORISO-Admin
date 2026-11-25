import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { expect, within } from 'storybook/test';
import type { SupervisorLogEntry } from '../../../types/supervisorLogs';
import { SupervisorLogsPage } from './index';

// GET .../service/users/supervisors/logs — `*` matches any configured origin.
const ENDPOINT = '*/service/users/supervisors/logs';

const ENTRIES: SupervisorLogEntry[] = [
    {
        relationId: 31,
        sessionId: 261,
        action: 'REPLACED',
        eventDate: '2026-11-24T10:02:00.000Z',
        supervisorConsultantId: 'c-blinky',
        supervisorName: 'Blinky Fish',
        previousSupervisorConsultantId: 'c-mona',
        previousSupervisorName: 'Mona Simpson',
        actorConsultantId: 'c-bart',
        actorName: 'Bart Simpson',
        notes: 'Mona Simpson ist ab Dezember in Elternzeit.',
        reasonCode: 'PEER_SUPPORT',
    },
    {
        relationId: 30,
        sessionId: 261,
        action: 'ADDED',
        eventDate: '2026-11-17T08:40:00.000Z',
        supervisorConsultantId: 'c-mona',
        supervisorName: 'Mona Simpson',
        actorConsultantId: 'c-bart',
        actorName: 'Bart Simpson',
        notes: 'Fallbesprechung zur Gesprächsführung',
        reasonCode: 'PEER_SUPPORT',
    },
    {
        relationId: 12,
        sessionId: 198,
        action: 'REMOVED',
        eventDate: '2026-11-10T15:20:00.000Z',
        supervisorConsultantId: 'c-selma',
        supervisorUsername: 'selma.b',
        actorConsultantId: 'c-herb',
        actorName: 'Herb Powell',
        notes: 'Einarbeitung abgeschlossen',
    },
];

const logsResponse = (entries: SupervisorLogEntry[]) =>
    HttpResponse.json({ data: entries, total: entries.length, page: 1, perPage: 20 });

const meta = {
    title: 'Organisms/Pages/Logs/SupervisorLogs',
    component: SupervisorLogsPage,
    parameters: { layout: 'fullscreen' },
    // Fresh React Query cache per story so the loading story is not served a sibling's cached data.
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
} satisfies Meta<typeof SupervisorLogsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * #2494 *6: a swap is one row — "Mona Simpson → Blinky Fish", who did it and why — not a
 * removal plus an addition. Additions and removals show who made them too.
 */
export const Filled: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => logsResponse(ENTRIES))] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Mona Simpson → Blinky Fish')).toBeInTheDocument();
        await expect(canvas.getByText('Gewechselt')).toBeInTheDocument();
        await expect(canvas.getByText('Mona Simpson ist ab Dezember in Elternzeit.')).toBeInTheDocument();
        await expect(canvas.getByText('Herb Powell')).toBeInTheDocument();
        await expect(canvas.queryByText('REPLACED')).toBeNull();
    },
};

/** Nothing recorded yet — the table shows its empty state. */
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
