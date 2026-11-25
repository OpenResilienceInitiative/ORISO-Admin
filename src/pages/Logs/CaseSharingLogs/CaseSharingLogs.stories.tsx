import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { expect, waitFor, within } from 'storybook/test';
import type { CaseSharingChangeEntry } from '../../../types/caseSharingLogs';
import { CASE_SHARING_LIST_BANDS } from './caseSharingListBands';
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
        changedBy: 'anna.admin',
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
        changedBy: 'ben.beispiel',
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

// Longest realistic content: a long centre name, a long username, the widest model pair and source.
const LONG_ENTRIES: CaseSharingChangeEntry[] = [1, 2, 3].map((id) => ({
    id,
    agencyId: 1234567,
    agencyName: 'Psychologische Beratungsstelle für Ehe-, Familien- und Lebensfragen der Caritas Musterstadt-Nord',
    tenantId: 1,
    changedAt: '2026-11-25T09:30:00Z',
    changedBy: 'katharina.mustermann-schmidt@beratungsstelle-musterstadt.example',
    previousModel: 'TEAM_COUNSELLING',
    newModel: 'CASE_HANDOVER',
    source: 'AGENCY_TYPE',
}));

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
        await expect(await canvas.findByText('anna.admin')).toBeInTheDocument();
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

// ---- Responsive presentation (docs/responsive-tables.md): the layout follows the width of the list
// container, not the viewport. The viewport stays a 1440px desktop in the threshold stories, so a narrow
// container proves it is the container that decides. Measured fit: see caseSharingListBands.ts.

const desktop = { viewport: { value: 'desktop', isRotated: false } } as const;
const TABLE_FROM = CASE_SHARING_LIST_BANDS.phoneBelow;

const inContainer =
    (width: number): Decorator =>
    (Story) =>
        (
            <div data-testid="container" style={{ width, maxWidth: '100%' }}>
                <Story />
            </div>
        );

const longContent = { msw: { handlers: [http.get(ENDPOINT, () => changesResponse(LONG_ENTRIES))] } };

/** Waits for the measured layout, then asserts nothing sticks out of the container or the page. */
const expectLayout = async (canvasElement: HTMLElement, layout: 'wide' | 'phone') => {
    const list = within(canvasElement).getByTestId('case-sharing-log');
    await waitFor(() => expect(list).toHaveAttribute('data-layout', layout));
    await waitFor(() => {
        expect(canvasElement.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
        expect(canvasElement.querySelector('[data-testid="data-table-skeleton-row"]')).toBeNull();
    });
    const container = within(canvasElement).getByTestId('container').getBoundingClientRect();
    const inside = (rect: DOMRect) => {
        expect(rect.left).toBeGreaterThanOrEqual(container.left - 1);
        expect(rect.right).toBeLessThanOrEqual(container.right + 1);
    };
    const table = within(canvasElement).getByRole('table');
    inside(table.getBoundingClientRect());
    canvasElement.querySelectorAll('tbody tr, tbody td').forEach((cell) => inside(cell.getBoundingClientRect()));
    // The table never needs its own scrollbar, and the page never scrolls sideways.
    const scroller = table.parentElement!;
    await expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    const root = canvasElement.ownerDocument.documentElement;
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    // Cards stack: the header row is screen-reader-only and each value names itself.
    const row = canvasElement.querySelector('tbody tr') as HTMLElement;
    await expect(getComputedStyle(row).display).toBe(layout === 'phone' ? 'block' : 'table-row');
    await expect(
        within(row)
            .queryAllByText('Zeitpunkt')
            .some((label) => label.offsetParent !== null),
    ).toBe(layout === 'phone');
};

/** Longest realistic content in a roomy container: names and usernames wrap inside the table. */
export const LongContent: Story = {
    globals: desktop,
    parameters: longContent,
    decorators: [inContainer(1440)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'wide');
    },
};

/** Exactly at the threshold the five columns still fit, with the longest content. */
export const AtTableThreshold: Story = {
    globals: desktop,
    parameters: longContent,
    decorators: [inContainer(TABLE_FROM)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'wide');
    },
};

/** One pixel below it every change becomes a card instead of a cramped table. */
export const JustBelowTableThreshold: Story = {
    globals: desktop,
    parameters: longContent,
    decorators: [inContainer(TABLE_FROM - 1)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'phone');
    },
};

/** Phone 390: cards, nothing overflows, and the pager's "next" is reachable by keyboard inside the list. */
export const PhoneCardsKeyboard: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    parameters: {
        msw: { handlers: [http.get(ENDPOINT, () => HttpResponse.json({ total: 45, entries: LONG_ENTRIES }))] },
    },
    decorators: [inContainer(390)],
    play: async ({ canvasElement, userEvent: user }) => {
        await expectLayout(canvasElement, 'phone');
        const next = within(canvasElement).getByRole('button', { name: /nächste seite/i });
        await expect(next).toBeEnabled();
        let reached = false;
        for (let step = 0; step < 30 && !reached; step += 1) {
            // eslint-disable-next-line no-await-in-loop
            await user.tab();
            reached = canvasElement.ownerDocument.activeElement === next;
        }
        await expect(reached).toBe(true);
        const bounds = within(canvasElement).getByTestId('container').getBoundingClientRect();
        const box = next.getBoundingClientRect();
        await expect(box.left).toBeGreaterThanOrEqual(bounds.left - 1);
        await expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
        const root = canvasElement.ownerDocument.documentElement;
        await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    },
};
