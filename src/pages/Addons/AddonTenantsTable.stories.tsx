import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { AddonTenantState } from '../../addons/addonTypes';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { AddonTenantsTable, TENANT_LIST_BANDS } from './AddonTenantsTable';

const ADDON = 'demo-tools';
const TENANTS = [
    { id: 1, name: 'Demo-Mandant' },
    { id: 2, name: 'Caritasverband für die Erzdiözese Freiburg und den Landkreis Breisgau-Hochschwarzwald' },
    { id: 3, name: 'Diakonie Nord' },
];
const STATES: AddonTenantState[] = [
    {
        tenantId: 1,
        mode: 'TENANT',
        enabled: false,
        updatedAt: '2026-11-14T08:15:00Z',
        agenciesEnabled: 2,
        agenciesDisabled: 1,
    },
    {
        tenantId: 2,
        mode: 'ON_HIDDEN',
        enabled: true,
        updatedAt: '2026-11-14T08:15:00Z',
        agenciesEnabled: 0,
        agenciesDisabled: 0,
    },
];

const Stage = ({ width }: { width: number }) => {
    setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0);
    return (
        // Exactly `width` wide, also in a smaller test browser: the layout follows this container.
        <div data-testid="stage" style={{ width }}>
            <AddonTenantsTable addonName={ADDON} selectedTenantId={1} onSelect={() => undefined} />
        </div>
    );
};

type Layout = 'wide' | 'tablet' | 'phone';

const meta = {
    title: 'Organisms/Pages/Addons/AddonTenantsTable',
    component: Stage,
    args: { width: 1100 },
    decorators: [withAdminProviders],
    parameters: {
        msw: {
            handlers: [
                http.get(`*/service/addons/admin/addons/${ADDON}/tenants`, () => HttpResponse.json(STATES)),
                http.get('*/service/tenantadmin/search', () =>
                    HttpResponse.json({
                        total: TENANTS.length,
                        _embedded: TENANTS.map((tenant) => ({ _embedded: { ...tenant, adminEmails: [] } })),
                    }),
                ),
            ],
        },
    },
} satisfies Meta<typeof Stage>;
export default meta;
type Story = StoryObj<typeof meta>;

const expectLayout =
    (layout: Layout): Story['play'] =>
    async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const list = await canvas.findByTestId('addon-tenants');
        await waitFor(() => expect(list).toHaveAttribute('data-layout', layout));
        await canvas.findByText(/^Diakonie Nord/);
        const stage = canvas.getByTestId('stage');
        await expect(list.getBoundingClientRect().right).toBeLessThanOrEqual(stage.getBoundingClientRect().right + 1);
        const table = list.querySelector('table');
        if (table?.parentElement) {
            await expect(table.scrollWidth).toBeLessThanOrEqual(table.parentElement.clientWidth + 1);
        }
        await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
            canvasElement.ownerDocument.documentElement.clientWidth,
        );
        const columns = layout === 'wide' ? 5 : 4;
        if (layout !== 'phone') {
            await expect(canvas.getAllByRole('columnheader')).toHaveLength(columns);
        }
        const helpButtons = canvas.getAllByRole('button', { name: /^(Modi erklären|Explain modes)$/ });
        await expect(helpButtons.length).toBe(layout === 'phone' ? list.querySelectorAll('tbody tr').length : 1);
        await userEvent.click(helpButtons[0]);
        const body = within(canvasElement.ownerDocument.body);
        const help = await body.findByText(
            /^(Für den Träger aktiv, er kann es nicht abschalten\.|Active for the organisation, it cannot switch it off\.)$/,
        );
        await waitFor(() => expect(help).toBeVisible());
        await userEvent.click(helpButtons[0]);
    };

/** Wide reference: every column on one row. */
export const Wide: Story = { args: { width: 1100 }, play: expectLayout('wide') };

// Boundaries (responsive-tables.md): at and just below each measured threshold.
export const AtWideThreshold: Story = { args: { width: TENANT_LIST_BANDS.wideFrom }, play: expectLayout('wide') };
export const BelowWideThreshold: Story = {
    args: { width: TENANT_LIST_BANDS.wideFrom - 1 },
    play: expectLayout('tablet'),
};
export const AtPhoneThreshold: Story = { args: { width: TENANT_LIST_BANDS.phoneBelow }, play: expectLayout('tablet') };
export const BelowPhoneThreshold: Story = {
    args: { width: TENANT_LIST_BANDS.phoneBelow - 1 },
    play: expectLayout('phone'),
};
/** 390 px phone: one card per Träger. */
export const Phone: Story = { args: { width: 358 }, play: expectLayout('phone') };
