import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import i18n from '../../../i18n';
import type { DataTableSort } from '../../../components/DataTable';
import type { AgencyData } from '../../../types/agency';
import { AgencyDataTable } from './AgencyDataTable';

const agency = (overrides: Record<string, unknown>): AgencyData =>
    ({
        id: '1',
        name: 'Caritas Beratungsstelle Mitte',
        street: 'Musterstraße',
        houseNumber: '12a',
        postcode: '10115',
        city: 'Berlin',
        tenantId: 1,
        tenantName: 'Caritas Nord',
        topics: [
            { id: 1, name: 'Schuldnerberatung' },
            { id: 2, name: 'Schwangerschaftsberatung' },
            { id: 3, name: 'Suchtberatung' },
        ],
        phone: '+49 30 123456',
        email: 'mitte@caritas.example',
        teamAgency: 'false',
        offline: false,
        status: 'CREATED',
        updateDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        ...overrides,
    } as unknown as AgencyData);

const ROWS: AgencyData[] = [
    agency({}),
    agency({
        id: '42',
        name: 'Beratungsstelle für Familien-, Paar- und Lebensfragen im Landkreis Nordwestmecklenburg',
        street: 'Lange Straße der Deutschen Einheit',
        houseNumber: '144–146',
        postcode: '23966',
        city: 'Wismar',
        teamAgency: 'true',
        // A long topic name must not widen the row: the cell truncates it.
        topics: [{ id: 4, name: 'Schwangerschaftskonfliktberatung nach § 219 StGB und Familienplanung' }],
    }),
    agency({ id: '7', name: 'Online-Beratung Süd', street: undefined, houseNumber: undefined, offline: true }),
    agency({ id: '9', name: 'Stelle in Auflösung', status: 'IN_DELETION', topics: [], phone: undefined }),
];

const Stage = ({
    width,
    showTenant = true,
    showTopics = true,
}: {
    width: number;
    showTenant?: boolean;
    showTopics?: boolean;
}) => {
    const [sort, setSort] = useState<DataTableSort | null>({ key: 'name', direction: 'asc' });
    return (
        // Exactly `width` wide, also in a smaller test browser: the layout follows this container.
        <div data-testid="stage" style={{ width }}>
            <AgencyDataTable
                rows={ROWS}
                loading={false}
                emptyText="Keine Daten"
                sort={sort}
                onSortChange={setSort}
                page={1}
                pageSize={10}
                total={ROWS.length}
                onPageChange={fn()}
                onPageSizeChange={fn()}
                showTenant={showTenant}
                tenantNameOf={(row) => row.tenantName}
                showTopics={showTopics}
                markMissingTopics
                onEdit={fn()}
                onDelete={fn()}
                ariaLabel="Beratungsstellen"
            />
        </div>
    );
};

const meta = {
    title: 'Pages/Agency/AgencyList',
    component: Stage,
    parameters: { layout: 'padded' },
    args: { width: 1180, showTenant: true, showTopics: true },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
    // responsive-tables.md: the list and its table stay inside their container (the page itself
    // is checked in AgencyListPage.stories).
    play: async ({ canvasElement }) => {
        const stage = within(canvasElement).getByTestId('stage');
        const list = within(canvasElement).getByTestId('agency-list');
        await expect(list.scrollWidth).toBeLessThanOrEqual(stage.clientWidth + 1);
        // The table must not scroll inside its own scroller either: every action stays reachable.
        const table = list.querySelector('table');
        if (table?.parentElement) {
            await expect(table.scrollWidth).toBeLessThanOrEqual(table.parentElement.clientWidth + 1);
        }
    },
} satisfies Meta<typeof Stage>;
export default meta;
type Story = StoryObj<typeof meta>;

type Layout = 'wide' | 'tablet' | 'phone';

/**
 * The first paint guesses the layout from the window; the container measurement follows a frame
 * later. Wait for the measured layout before checking anything else.
 */
const settle = async (canvasElement: HTMLElement, layout: Layout) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
        if (layout === 'phone') return expect(canvas.queryByRole('table')).toBeNull();
        const id = canvas.queryByRole('columnheader', { name: /^ID/ });
        return layout === 'wide' ? expect(id).not.toBeNull() : expect(id).toBeNull();
    });
    return canvas;
};

/**
 * 1440 px viewport: 1144 px content next to the 128 px rail and 168 px gutters. A Träger admin
 * (topics, no Träger column) gets the wide row there.
 */
export const Desktop1440: Story = {
    args: { width: 1144, showTenant: false },
    play: async (context) => {
        const canvas = await settle(context.canvasElement, 'wide');
        await meta.play?.(context);
        await expect(canvas.getByText('Teamberatung')).toBeVisible();
        await userEvent.click(
            canvas.getByRole('button', { name: 'Details zu Caritas Beratungsstelle Mitte anzeigen' }),
        );
        await expect(canvas.getByRole('link', { name: 'mitte@caritas.example' })).toBeVisible();
    },
};

/** 820 px tablet: ID moves under the name, actions into ⋯. */
export const Tablet820: Story = {
    args: { width: 772 },
    play: async (context) => {
        const canvas = await settle(context.canvasElement, 'tablet');
        await meta.play?.(context);
        await expect(canvas.getAllByRole('button', { name: /^Weitere Aktionen für/ })).toHaveLength(ROWS.length);
    },
};

/** 390 px phone: one card per Beratungsstelle. */
export const Phone390: Story = {
    args: { width: 358 },
    play: async (context) => {
        const canvas = await settle(context.canvasElement, 'phone');
        await meta.play?.(context);
        await expect(canvas.getAllByRole('article')).toHaveLength(ROWS.length);
    },
};

const expectLayout =
    (layout: Layout): Story['play'] =>
    async (context) => {
        await settle(context.canvasElement, layout);
        await meta.play?.(context);
    };

// Boundaries (responsive-tables.md): at and just below each measured threshold.
/** Platform admin with every column: wide from 1290 px. */
export const AllColumnsAtWideThreshold: Story = { args: { width: 1290 }, play: expectLayout('wide') };
export const AllColumnsBelowWideThreshold: Story = { args: { width: 1289 }, play: expectLayout('tablet') };

/** No Träger and no topics column: wide from 920 px. */
export const FewestColumnsAtWideThreshold: Story = {
    args: { width: 920, showTenant: false, showTopics: false },
    play: expectLayout('wide'),
};
export const FewestColumnsBelowWideThreshold: Story = {
    args: { width: 919, showTenant: false, showTopics: false },
    play: expectLayout('tablet'),
};

/** Every column still fits the tablet row at 640 px; one pixel less shows cards. */
export const AllColumnsAtPhoneThreshold: Story = { args: { width: 640 }, play: expectLayout('tablet') };
export const AllColumnsBelowPhoneThreshold: Story = { args: { width: 639 }, play: expectLayout('phone') };
