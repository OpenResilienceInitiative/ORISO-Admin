import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { AddonAuditEntry } from '../../../addons/addonTypes';
import { UserRole } from '../../../enums/UserRole';
import { ADDON, AGENCIES, createAddonBackend } from '../../../utils/storybook/addonFixtures';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { AUDIT_LIST_BANDS } from './auditFilters';
import { AddonAuditLogsPage } from './index';

const ENTRIES: AddonAuditEntry[] = [1, 2, 3].map((id) => ({
    id,
    createdAt: '2026-11-14T08:15:00Z',
    addon: id === 3 ? 'suchtberatung-dokumentation-und-auswertung' : ADDON,
    appId: id === 1 ? 'goals' : null,
    action: id === 2 ? 'settings.agency.override.changed' : 'goal.released.to.advice.seeker',
    summary: {
        de: 'Ziel „Weniger trinken an Wochenenden“ für die ratsuchende Person freigegeben und Erinnerung gesetzt',
        en: 'Goal "Drink less at weekends" released to the advice seeker and reminder set',
    },
    actor: {
        id: 'c2e9a0f1-6b3d-47a8-8e02-d41b7c5a9e63',
        username: id === 2 ? 'beraterin.mit.einem.sehr.langen.benutzernamen' : 'erika',
        roles: ['consultant', 'tenant-admin', 'offline_access'],
    },
    tenantId: 2,
    agencyId: AGENCIES[id % 2].id,
    sessionId: 1234567,
    subjectId: '9d4a7b10-52ce-4f68-a3b9-1e8c0d6f2a75',
}));

const backend = createAddonBackend();

const desktop = { viewport: { value: 'desktop', isRotated: false } } as const;

const inContainer =
    (width: number): Decorator =>
    (Story) => {
        setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0);
        return (
            <div data-testid="container" style={{ width, maxWidth: '100%' }}>
                <Story />
            </div>
        );
    };

const meta = {
    title: 'Organisms/Pages/Logs/AddonAuditLogs',
    component: AddonAuditLogsPage,
    decorators: [withAdminProviders],
    globals: desktop,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [
                http.get('*/service/addons/admin/audit', () =>
                    HttpResponse.json({ items: ENTRIES, page: 0, size: 20, total: ENTRIES.length }),
                ),
                http.get('*/service/agencyadmin/agencies/:id', ({ params }) => {
                    const agency = AGENCIES.find((candidate) => candidate.id === Number(params.id));
                    return agency ? HttpResponse.json({ _embedded: agency }) : new HttpResponse(null, { status: 404 });
                }),
                ...backend.handlers,
            ],
        },
    },
} satisfies Meta<typeof AddonAuditLogsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

type Layout = 'wide' | 'tablet' | 'phone';

/** Waits for the measured layout with real rows, then asserts nothing sticks out of the container or the page. */
const expectLayout = async (canvasElement: HTMLElement, layout: Layout) => {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId('addon-audit-log');
    await waitFor(() => expect(list).toHaveAttribute('data-layout', layout));
    await canvas.findByText('beraterin.mit.einem.sehr.langen.benutzernamen');
    await waitFor(() => expect(canvas.getAllByText(AGENCIES[0].name).length).toBeGreaterThan(0));
    const container = canvas.getByTestId('container').getBoundingClientRect();
    const inside = (rect: DOMRect) => {
        expect(rect.left).toBeGreaterThanOrEqual(container.left - 1);
        expect(rect.right).toBeLessThanOrEqual(container.right + 1);
    };
    const table = canvas.getByRole('table');
    inside(table.getBoundingClientRect());
    canvasElement.querySelectorAll('tbody tr, tbody td').forEach((cell) => inside(cell.getBoundingClientRect()));
    const scroller = table.parentElement!;
    await expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    const root = canvasElement.ownerDocument.documentElement;
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    const row = canvasElement.querySelector('tbody tr') as HTMLElement;
    await expect(getComputedStyle(row).display).toBe(layout === 'phone' ? 'block' : 'table-row');
    if (layout !== 'phone') {
        await expect(canvas.getAllByRole('columnheader')).toHaveLength(layout === 'wide' ? 8 : 6);
    }
};

const layoutStory = (width: number, layout: Layout): Story => ({
    decorators: [inContainer(width)],
    play: async ({ canvasElement }) => expectLayout(canvasElement, layout),
});

// Measured fit (docs/responsive-tables.md; Chromium, de-DE, the long rows above, width of the list's
// container): the eight columns need 1030px -> wideFrom 1040; the six combined columns need 724px ->
// phoneBelow 730; below that every entry is a card. The viewport stays a 1440px desktop, so the
// narrow containers prove that the container decides.

/** Wide reference: every column on one row. */
export const WideReference = layoutStory(1440, 'wide');
export const AtWideThreshold = layoutStory(AUDIT_LIST_BANDS.wideFrom, 'wide');
/** Action and subject fold into the add-on and agency cells instead of the table overflowing. */
export const BelowWideThreshold = layoutStory(AUDIT_LIST_BANDS.wideFrom - 1, 'tablet');
export const AtPhoneThreshold = layoutStory(AUDIT_LIST_BANDS.phoneBelow, 'tablet');
export const BelowPhoneThreshold = layoutStory(AUDIT_LIST_BANDS.phoneBelow - 1, 'phone');

/** A 420px container inside a desktop viewport gets cards; the toolbar scrolls locally and keeps focus visible. */
export const NarrowContainerInDesktopViewport: Story = {
    decorators: [inContainer(420)],
    play: async ({ canvasElement }) => {
        await expectLayout(canvasElement, 'phone');
        const reset = within(canvasElement).getByRole('button', { name: /^(Filter zurücksetzen|Reset filters)$/ });
        reset.focus();
        await userEvent.tab({ shift: true });
        await userEvent.tab();
        await expect(reset).toHaveFocus();
        const toolbar = reset.parentElement!.getBoundingClientRect();
        const button = reset.getBoundingClientRect();
        await expect(button.left).toBeGreaterThanOrEqual(toolbar.left - 1);
        await expect(button.right).toBeLessThanOrEqual(toolbar.right + 1);
        const root = canvasElement.ownerDocument.documentElement;
        await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    },
};
