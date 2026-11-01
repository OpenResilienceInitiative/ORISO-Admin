import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, waitFor, within } from 'storybook/test';
import type { DeletionAuditLogEntry } from '../../../types/deletionAuditLogs';
import { DeletionAuditLogsPage } from './index';
import { COMBINED_MIN, WIDE_MIN } from './useDeletionLogLayout';

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

// ---- Responsive presentation (docs/responsive-tables.md): the layout follows the width of the list
// container, not the viewport. Measured in Chromium with the widest labels and ids of ENTRIES-like rows
// (de-DE): seven columns need 1335px -> WIDE_MIN 1340; the five combined columns need 645px ->
// COMBINED_MIN 650; below that every row is a card. The container is the story's wrapper, the viewport
// stays a 1440px desktop so a narrow container proves it is the container that decides.

const desktop = { viewport: { value: 'desktop', isRotated: false } } as const;

const inContainer =
    (width: number): Decorator =>
    (Story) =>
        (
            <div data-testid="container" style={{ width, maxWidth: '100%' }}>
                <Story />
            </div>
        );

const LONG_ENTRIES: DeletionAuditLogEntry[] = [1, 2, 3].map((id) => ({
    id,
    actorId: 'c2e9a0f1-6b3d-47a8-8e02-d41b7c5a9e63-c2e9a0f1-6b3d-47a8-8e02-d41b7c5a9e63',
    actorRole: 'SOME_FUTURE_ACTOR_ROLE_WITHOUT_A_TRANSLATION',
    targetType: id % 2 ? 'AGENCY_ADMIN' : 'TENANT_ADMIN',
    targetId: '9d4a7b10-52ce-4f68-a3b9-1e8c0d6f2a75-9d4a7b10-52ce-4f68-a3b9-1e8c0d6f2a75',
    tenantId: 1234567890,
    outcome: id % 2 ? 'CANCELLED' : 'EXECUTED',
    createDate: '2026-10-01T15:12:00.000Z',
}));

const handlers = (entries: DeletionAuditLogEntry[] = ENTRIES) => ({
    msw: { handlers: [http.get(ENDPOINT, () => logsResponse(entries))] },
});

/** Waits for the measured layout, then asserts nothing sticks out of the container or the page. */
const expectLayout = async (canvasElement: HTMLElement, layout: 'wide' | 'combined' | 'cards') => {
    const list = within(canvasElement).getByTestId('deletion-log');
    await waitFor(() => expect(list).toHaveAttribute('data-layout', layout));
    // Real rows, not the loading skeleton, are what must fit.
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
    inside(table.parentElement!.parentElement!.getBoundingClientRect());
    canvasElement.querySelectorAll('tbody tr, tbody td').forEach((cell) => inside(cell.getBoundingClientRect()));
    // The table never needs its own scrollbar, and the page never scrolls sideways.
    const scroller = table.parentElement!;
    await expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    const root = canvasElement.ownerDocument.documentElement;
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    // Cards stack: the header row is screen-reader-only and each value names itself.
    const row = canvasElement.querySelector('tbody tr') as HTMLElement;
    await expect(getComputedStyle(row).display).toBe(layout === 'cards' ? 'block' : 'table-row');
    await expect(
        within(row)
            .queryAllByText('Zeitpunkt')
            .some((label) => label.offsetParent !== null),
    ).toBe(layout === 'cards');
    return list;
};

/** Wide reference: a roomy container keeps the seven-column table. */
export const WideReference: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(1440)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'wide');
        await expect(within(canvasElement).getAllByRole('columnheader')).toHaveLength(7);
    },
};

/** Exactly at the measured wide threshold the seven columns still fit. */
export const AtWideThreshold: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(WIDE_MIN)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'wide');
    },
};

/** One pixel below it, type and role fold into target and actor instead of the table overflowing. */
export const JustBelowWideThreshold: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(WIDE_MIN - 1)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'combined');
        await expect(within(canvasElement).getAllByRole('columnheader')).toHaveLength(5);
    },
};

/** Exactly at the combined threshold the five columns still fit. */
export const AtCombinedThreshold: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(COMBINED_MIN)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'combined');
    },
};

/** One pixel below it, every row becomes a card. */
export const JustBelowCombinedThreshold: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(COMBINED_MIN - 1)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'cards');
    },
};

/** A 420px container inside a 1440px desktop viewport (e.g. next to a side panel) still gets cards. */
export const NarrowContainerInDesktopViewport: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(420)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'cards');
        await expect(window.innerWidth).toBeGreaterThan(1200);
    },
};

/** Phone viewport: cards, with the filter row scrolling locally instead of the page. */
export const Phone390: Story = {
    globals: { viewport: { value: 'phone', isRotated: false } },
    parameters: handlers(),
    decorators: [inContainer(390)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'cards');
        const toolbar = canvasElement.querySelector('[class*="toolbar"]') as HTMLElement;
        await expect(getComputedStyle(toolbar).flexWrap).toBe('nowrap');
        await expect(getComputedStyle(toolbar).overflowX).toBe('auto');
        await expect(toolbar.scrollWidth).toBeGreaterThan(toolbar.clientWidth);
    },
};

/** Unbroken ids, an untranslated role and a large tenant number wrap inside cards... */
export const LongContentCards: Story = {
    globals: desktop,
    parameters: handlers(LONG_ENTRIES),
    decorators: [inContainer(360)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'cards');
    },
};

/** ...and inside the combined table. */
export const LongContentCombined: Story = {
    globals: desktop,
    parameters: handlers(LONG_ENTRIES),
    decorators: [inContainer(COMBINED_MIN)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'combined');
    },
};

/** Tabbing through the filter row keeps every focused control inside the toolbar's scrollport. */
export const KeyboardFocusInNarrowContainer: Story = {
    globals: desktop,
    parameters: handlers(),
    decorators: [inContainer(390)],
    play: async ({ canvasElement, userEvent: user }) => {
        await expectLayout(canvasElement, 'cards');
        // A late font swap would resize the buttons after the browser scrolled them into view.
        await canvasElement.ownerDocument.fonts.ready;
        const toolbar = canvasElement.querySelector('[class*="toolbar"]') as HTMLElement;
        let focusedInToolbar = 0;
        for (let step = 0; step < 12; step += 1) {
            // eslint-disable-next-line no-await-in-loop
            await user.tab();
            const active = canvasElement.ownerDocument.activeElement as HTMLElement;
            if (!toolbar.contains(active)) {
                if (focusedInToolbar > 0) break;
            } else {
                focusedInToolbar += 1;
                const box = active.getBoundingClientRect();
                const port = toolbar.getBoundingClientRect();
                // eslint-disable-next-line no-await-in-loop
                await waitFor(() => {
                    const now = active.getBoundingClientRect();
                    expect(now.left).toBeGreaterThanOrEqual(port.left - 1);
                    expect(now.right).toBeLessThanOrEqual(port.right + 1);
                });
                expect(box.height).toBeGreaterThan(0);
            }
        }
        await expect(focusedInToolbar).toBeGreaterThanOrEqual(3);
        const root = canvasElement.ownerDocument.documentElement;
        await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    },
};
