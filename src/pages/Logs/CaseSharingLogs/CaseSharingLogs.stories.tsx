import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { expect } from 'storybook/test';
import type { CaseSharingChangeEntry } from '../../../types/caseSharingLogs';
import { CaseSharingLogsPage } from './index';

// GET .../service/agencyadmin/agencies/case-sharing-changes — `*` matches any configured origin.
const ENDPOINT = '*/service/agencyadmin/agencies/case-sharing-changes';

const ENTRIES: CaseSharingChangeEntry[] = [
    {
        id: 3,
        agencyId: 5,
        agencyName: 'Beratungsstelle Mitte',
        tenantId: 1,
        changedAt: '2026-11-25T09:00:00Z',
        changedBy: 'Anna Admin',
        previousModel: 'CASE_HANDOVER',
        newModel: 'TEAM_COUNSELLING',
        source: 'AGENCY_SETTINGS',
    },
    {
        id: 2,
        agencyId: 8,
        agencyName: 'Suchtberatung am Hauptbahnhof',
        tenantId: 1,
        changedAt: '2026-11-18T14:30:00Z',
        changedBy: 'Ben Beispiel',
        previousModel: 'TEAM_COUNSELLING',
        newModel: 'NONE',
        source: 'AGENCY_TYPE',
    },
    {
        id: 1,
        agencyId: 5,
        agencyName: 'Beratungsstelle Mitte',
        tenantId: 1,
        changedAt: '2026-10-01T08:00:00Z',
        changedBy: null,
        previousModel: null,
        newModel: 'CASE_HANDOVER',
        source: 'AGENCY_SETTINGS',
    },
];

const changesResponse = (entries: CaseSharingChangeEntry[]) => HttpResponse.json({ total: entries.length, entries });

const meta = {
    title: 'Organisms/Pages/Logs/CaseSharingLogs',
    component: CaseSharingLogsPage,
    parameters: { layout: 'fullscreen' },
    // Fresh React Query cache per story so no story is served a sibling's cached data.
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
} satisfies Meta<typeof CaseSharingLogsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every switch, newest first. The first recorded model has no "before" and was set by the system. */
export const WithChanges: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => changesResponse(ENTRIES))] } },
    play: async ({ canvas }) => {
        await expect(await canvas.findByText('Anna Admin')).toBeInTheDocument();
        await expect(canvas.getByText(/Jeder Fall behält das Modell/)).toBeInTheDocument();
        await expect(canvas.getByText('Fallübergabe → Teamberatung')).toBeInTheDocument();
        await expect(canvas.getByText('— → Fallübergabe')).toBeInTheDocument();
        await expect(canvas.getByText('System')).toBeInTheDocument();
        await expect(canvas.getByText('Art der Beratungsstelle')).toBeInTheDocument();
    },
};

/** No Beratungsstelle has switched its model yet. */
export const Empty: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => changesResponse([]))] } },
    play: async ({ canvas }) => {
        await expect(await canvas.findByText('Noch keine Änderung der Fallteilung')).toBeInTheDocument();
    },
};

/** Backend failure (500): the error pop-up with retry, and the table says it could not load. */
export const Error: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))] } },
    play: async ({ canvas }) => {
        await expect(await canvas.findByTestId('admin-empty')).toBeInTheDocument();
        await expect(canvas.queryByText('Noch keine Änderung der Fallteilung')).not.toBeInTheDocument();
    },
};

/** The backend refuses the admin (403): said in place, no redirect and no retry. */
export const Forbidden: Story = {
    parameters: { msw: { handlers: [http.get(ENDPOINT, () => new HttpResponse(null, { status: 403 }))] } },
    play: async ({ canvas }) => {
        // Once in the pop-up, once as the table's quiet text.
        const notices = await canvas.findAllByText(
            'Sie haben keine Berechtigung, das Fallteilungs-Protokoll zu sehen.',
        );
        await expect(notices.length).toBeGreaterThan(0);
    },
};
