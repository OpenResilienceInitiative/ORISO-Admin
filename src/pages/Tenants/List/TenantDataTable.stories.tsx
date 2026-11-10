import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import i18n from '../../../i18n';
import type { DataTableSort } from '../../../components/DataTable';
import { TenantDataTable, type TenantRow } from './TenantDataTable';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const tenant = (overrides: Record<string, unknown>): TenantRow =>
    ({
        id: 21,
        name: 'Caritas Nord',
        active: true,
        subdomain: 'nord',
        licensing: { allowedNumberOfUsers: 40 },
        adminEmails: ['admin@nord.example', 'stellvertretung@nord.example'],
        createDate: daysAgo(500),
        updateDate: daysAgo(3),
        ...overrides,
    } as unknown as TenantRow);

const ROWS: TenantRow[] = [
    tenant({}),
    tenant({
        id: 34,
        name: 'Diakonisches Werk für Familien-, Paar- und Lebensberatung im Landkreis',
        subdomain: 'diakonie-familienberatung-landkreis',
        adminEmails: ['traeger.administration.sehr.lang@diakonie-familienberatung.example'],
        licensing: { allowedNumberOfUsers: 250 },
        updateDate: daysAgo(40),
    }),
    tenant({ id: 7, name: 'Neuer Träger', subdomain: 'neu', adminEmails: [], updateDate: daysAgo(1) }),
];

const Stage = ({ width, showSubdomain = true }: { width: number; showSubdomain?: boolean }) => {
    const [sort, setSort] = useState<DataTableSort | null>({ key: 'name', direction: 'asc' });
    return (
        // Exactly `width` wide, also in a smaller test browser: the layout follows this container.
        <div data-testid="stage" style={{ width }}>
            <TenantDataTable
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
                showSubdomain={showSubdomain}
                onEdit={fn()}
                onDelete={fn()}
                canDeleteRow={(row) => row.id !== 21}
                ariaLabel="Träger"
            />
        </div>
    );
};

const meta = {
    title: 'Pages/Tenants/TenantList',
    component: Stage,
    parameters: { layout: 'padded' },
    args: { width: 1144, showSubdomain: true },
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
    // is checked in TenantListPage.stories).
    play: async ({ canvasElement }) => {
        const stage = within(canvasElement).getByTestId('stage');
        const list = within(canvasElement).getByTestId('tenant-list');
        await expect(list.scrollWidth).toBeLessThanOrEqual(stage.clientWidth + 1);
        const table = list.querySelector('table');
        if (table?.parentElement) {
            await expect(table.scrollWidth).toBeLessThanOrEqual(table.parentElement.clientWidth + 1);
        }
    },
} satisfies Meta<typeof Stage>;
export default meta;
type Story = StoryObj<typeof meta>;

type Layout = 'wide' | 'tablet' | 'phone';

/** The first paint guesses from the window; wait for the measured container layout. */
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
 * 1440 px viewport: 1144 px content next to the rail; status, ID, admins' e-mail and both dates per
 * row. Subdomain and the maximum of counsellors are in the details.
 */
export const Desktop1440: Story = {
    play: async (context) => {
        const canvas = await settle(context.canvasElement, 'wide');
        await meta.play?.(context);
        await expect(canvas.getByText('+1')).toBeVisible();
        await expect(canvas.queryByRole('columnheader', { name: /^Subdomain/ })).toBeNull();
        await expect(canvas.queryByRole('columnheader', { name: /^Max\./ })).toBeNull();
        // The name column is the widest one.
        const widths = canvas.getAllByRole('columnheader').map((header) => header.getBoundingClientRect().width);
        await expect(widths[0]).toBe(Math.max(...widths));
        await userEvent.click(canvas.getByRole('button', { name: 'Details zu Caritas Nord anzeigen' }));
        await expect(canvas.getByRole('link', { name: 'stellvertretung@nord.example' })).toBeVisible();
        await expect(canvas.getByRole('link', { name: /^nord\./ })).toBeVisible();
        await expect(canvas.getByText('Max. erlaubte Berater')).toBeVisible();
        await expect(canvas.getByText('40')).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Caritas Nord löschen' })).toBeDisabled();
    },
};

/** Single-domain installation: the details show the maximum of counsellors but no subdomain. */
export const SingleDomainDetails: Story = {
    args: { showSubdomain: false },
    play: async (context) => {
        const canvas = await settle(context.canvasElement, 'wide');
        await userEvent.click(canvas.getByRole('button', { name: 'Details zu Caritas Nord anzeigen' }));
        await expect(canvas.getByText('Max. erlaubte Berater')).toBeVisible();
        await expect(canvas.queryByText('Subdomain')).toBeNull();
    },
};

/** 820 px tablet: ID moves under the name, dates into the details, actions into ⋯. */
export const Tablet820: Story = {
    args: { width: 772 },
    play: async (context) => {
        const canvas = await settle(context.canvasElement, 'tablet');
        await meta.play?.(context);
        await expect(canvas.getAllByRole('button', { name: /^Weitere Aktionen für/ })).toHaveLength(ROWS.length);
    },
};

/** 390 px phone: one card per Träger. */
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

// Boundaries (responsive-tables.md): at and just below the measured threshold.
/** Wide from 875 px, with or without the subdomain (it is in the details). */
export const AtWideThreshold: Story = { args: { width: 875 }, play: expectLayout('wide') };
export const BelowWideThreshold: Story = { args: { width: 874 }, play: expectLayout('tablet') };
export const SingleDomainAtWideThreshold: Story = {
    args: { width: 875, showSubdomain: false },
    play: expectLayout('wide'),
};

/** The tablet row fits at 600 px; one pixel less shows cards. */
export const AtPhoneThreshold: Story = { args: { width: 600 }, play: expectLayout('tablet') };
export const BelowPhoneThreshold: Story = { args: { width: 599 }, play: expectLayout('phone') };
