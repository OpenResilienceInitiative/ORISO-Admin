import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import routePathNames from '../../appConfig';
import { installAddonShared } from '../../addons/addonShared';
import type { AddonRegistry, AddonSettings, AddonStats, AdminAddon } from '../../addons/addonTypes';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { AddonAdminPage, AddonsLayout, AddonsOverview } from './index';
import { adminPagePath } from './AddonsLayout';

const ADDON = 'demo-tools';
const TENANT = { id: 1, name: 'Demo-Mandant' };
const AGENCY = { id: 12, name: 'Suchtberatung Freiburg' };
const BUNDLE_PATH = `/service/addons/${ADDON}/ui/index.js`;

const adminAddon = (tenantId: number): AdminAddon => ({
    manifest: {
        name: ADDON,
        version: '1.2.0',
        contract: 'oriso-addon/v1',
        apps: [{ id: 'report', title: { de: 'Auswertung', en: 'Report' }, slots: ['admin.page'] }],
        stats: [
            { id: 'sessions', label: { de: 'Sitzungen', en: 'Sessions' } },
            { id: 'exports', label: { de: 'Exporte', en: 'Exports' } },
        ],
    },
    tenantId,
    enabled: true,
    agencyOverrides: [{ tenantId, agencyId: AGENCY.id, enabled: false }],
});

const registry: AddonRegistry = {
    contract: 'oriso-addon/v1',
    addons: [
        {
            name: ADDON,
            version: '1.2.0',
            entry: BUNDLE_PATH,
            apiBase: `/service/addons/${ADDON}/api`,
            apps: [{ id: 'report', title: { de: 'Auswertung', en: 'Report' }, slots: ['admin.page'] }],
        },
    ],
};

const settings: AddonSettings = {
    schema: {
        type: 'object',
        required: ['greeting'],
        properties: {
            greeting: { type: 'string', title: 'Begrüßungstext', default: 'Willkommen', maxLength: 80 },
            showReminder: { type: 'boolean', title: 'Erinnerung anzeigen', default: true },
            reminderDays: { type: 'integer', title: 'Erinnerung nach Tagen', minimum: 1, maximum: 30, default: 7 },
        },
    },
    values: { greeting: 'Schön, dass Sie da sind' },
};

const stats: AddonStats = {
    stats: [
        { id: 'sessions', value: 128 },
        { id: 'exports', value: null },
    ],
};

/**
 * A complete `oriso-addon/v1` bundle: an ES module that takes React from the host
 * (`__ORISO_ADDON_SHARED__`) and exports the mount lifecycle, served the way the
 * AddonService serves the real ones. It unmounts on a timer so its root is not torn down
 * inside the act() scope of Storybook's story cleanup.
 */
const BUNDLE_SOURCE = `
const { react: React, reactDomClient } = globalThis.__ORISO_ADDON_SHARED__;
const roots = new WeakMap();
export const mount = (props) => {
    const root = reactDomClient.createRoot(props.domElement);
    roots.set(props.domElement, root);
    root.render(
        React.createElement('section', { 'aria-label': 'Demo-Auswertung' },
            React.createElement('h3', null, 'Auswertung aus dem Add-on'),
            React.createElement('p', null, 'Träger: ' + (props.tenant.name ?? props.tenant.id)),
        ),
    );
};
export const unmount = (props) => {
    const root = roots.get(props.domElement);
    roots.delete(props.domElement);
    return new Promise((resolve) => setTimeout(() => {
        root?.unmount();
        resolve();
    }));
};
`;

const handlers = [
    http.get('*/service/addons/registry', () => HttpResponse.json(registry)),
    http.get('*/service/addons/admin/addons', ({ request }) =>
        HttpResponse.json([adminAddon(Number(new URL(request.url).searchParams.get('tenantId')))]),
    ),
    http.get(`*/service/addons/admin/addons/${ADDON}/stats`, () => HttpResponse.json(stats)),
    http.get(`*/service/addons/admin/addons/${ADDON}/settings`, () => HttpResponse.json(settings)),
    http.get(`*/service/agencyadmin/agencies/${AGENCY.id}`, () => HttpResponse.json(AGENCY)),
    http.get('*/service/agencyadmin/agencies', () =>
        HttpResponse.json({ total: 1, _embedded: [{ _embedded: { ...AGENCY, tenantId: TENANT.id } }] }),
    ),
    http.get('*/service/tenantadmin/search', () =>
        HttpResponse.json({ total: 1, _embedded: [{ _embedded: { ...TENANT, adminEmails: [] } }] }),
    ),
    http.get(`*${BUNDLE_PATH}`, () =>
        HttpResponse.text(BUNDLE_SOURCE, { headers: { 'Content-Type': 'text/javascript' } }),
    ),
];

const withAddonsRoutes =
    (roles: UserRole[], tenantId: number, initialPath: string = routePathNames.addons) =>
    (Story: () => ReactElement) => {
        setStoryAuth(roles, tenantId);
        installAddonShared();
        return (
            <Routes>
                <Route path="/" element={<Navigate to={initialPath} replace />} />
                <Route path={routePathNames.addons} element={<Story />}>
                    <Route index element={<AddonsOverview />} />
                    <Route path="apps/:addonName/:appId" element={<AddonAdminPage />} />
                </Route>
            </Routes>
        );
    };

const meta = {
    title: 'Organisms/Pages/Addons/AddonsPage',
    component: AddonsLayout,
    parameters: { layout: 'fullscreen', msw: { handlers } },
    decorators: [withAdminProviders],
} satisfies Meta<typeof AddonsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const openSection = async (card: HTMLElement, name: RegExp) => {
    await userEvent.click(within(card).getByRole('button', { name }));
};

/**
 * Träger admin: sees the add-on, its statistics, the agency exception and the settings
 * form generated from the JSON Schema. Only a platform admin may switch the add-on itself.
 */
export const TraegerAdmin: Story = {
    decorators: [withAddonsRoutes([UserRole.TenantAdmin], TENANT.id)],
    play: async ({ canvas }) => {
        const card = await canvas.findByTestId(`addon-card-${ADDON}`);
        const scoped = within(card);

        await expect(
            scoped.getByRole('switch', { name: /Für den Träger aktiv|Active for the organisation/ }),
        ).toBeDisabled();
        await expect(await scoped.findByText('128')).toBeVisible();
        await expect(scoped.getByText(/Keine Daten|No data/)).toBeVisible();

        await openSection(card, /Beratungsstellen|Agencies/);
        await expect(await scoped.findByText(`${AGENCY.name} (${AGENCY.id})`)).toBeVisible();

        await openSection(card, /Einstellungen|Settings/);
        const greeting = await scoped.findByDisplayValue('Schön, dass Sie da sind');
        await waitFor(() => expect(greeting).toBeVisible());
        await expect(scoped.getByRole('switch', { name: 'Erinnerung anzeigen' })).toBeChecked();
        await expect(scoped.getByDisplayValue('7')).toBeVisible();
    },
};

/** Platform admin: picks a Träger first, then may switch the add-on for it. */
export const PlatformAdmin: Story = {
    decorators: [withAddonsRoutes([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0)],
    play: async ({ canvas, canvasElement }) => {
        const tenantPicker = await canvas.findByRole('combobox', { name: /Träger|Organisation/ });
        await expect(canvas.queryByTestId(`addon-card-${ADDON}`)).toBeNull();

        await userEvent.click(tenantPicker);
        const option = await within(canvasElement.ownerDocument.body).findByTitle(`${TENANT.name} (${TENANT.id})`);
        await userEvent.click(option);
        await waitFor(() =>
            expect(
                canvasElement.ownerDocument.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),
            ).toBeNull(),
        );

        const card = await canvas.findByTestId(`addon-card-${ADDON}`);
        await waitFor(() =>
            expect(
                within(card).getByRole('switch', { name: /Für den Träger aktiv|Active for the organisation/ }),
            ).toBeEnabled(),
        );
    },
};

/** An `admin.page` app of the add-on, loaded as an ES module and mounted in its own tab. */
export const AdminPageTab: Story = {
    decorators: [withAddonsRoutes([UserRole.TenantAdmin], TENANT.id, adminPagePath(ADDON, 'report'))],
    play: async ({ canvas }) => {
        await expect(await canvas.findByRole('heading', { name: 'Auswertung aus dem Add-on' })).toBeVisible();
        await expect(canvas.getByText(`Träger: ${TENANT.name}`)).toBeVisible();
    },
};
