import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import routePathNames from '../../appConfig';
import { installAddonShared } from '../../addons/addonShared';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { AddonAdminPage, AddonsLayout, AddonsOverview } from './index';
import { adminPagePath } from './AddonsLayout';
import {
    ADDON,
    AGENCIES,
    BUNDLE_PATH,
    NOTICE_ADDON,
    SCREENSHOT_CAPTION,
    TENANTS,
    createAddonBackend,
} from '../../utils/storybook/addonFixtures';

const TENANT = TENANTS[0];

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

const bundleHandler = http.get(`*${BUNDLE_PATH}`, () =>
    HttpResponse.text(BUNDLE_SOURCE, { headers: { 'Content-Type': 'text/javascript' } }),
);

const backend = createAddonBackend();
const backendWithoutReadme = createAddonBackend({ readme: false });

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
    parameters: { layout: 'fullscreen', msw: { handlers: [...backend.handlers, bundleHandler] } },
    decorators: [withAdminProviders],
    beforeEach: () => {
        backend.reset();
        backendWithoutReadme.reset();
    },
} satisfies Meta<typeof AddonsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const SUPER_ADMIN = [UserRole.TenantAdmin, UserRole.AgencyAdmin];

const pickOption = async (canvasElement: HTMLElement, combobox: HTMLElement, label: RegExp) => {
    await userEvent.click(combobox);
    await waitFor(() =>
        expect(
            canvasElement.ownerDocument.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),
        ).not.toBeNull(),
    );
    const open = canvasElement.ownerDocument.querySelector(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
    ) as HTMLElement;
    await userEvent.click(within(open).getByTitle(label));
    await waitFor(() =>
        expect(
            canvasElement.ownerDocument.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),
        ).toBeNull(),
    );
};

const readmeImage = (scope: HTMLElement) =>
    within(scope).getByRole('img', { name: 'Zielübersicht im Beratungsportal' }) as HTMLImageElement;

/**
 * Träger admin: one card per add-on the platform admin made visible. The switch appears only
 * where the Träger decides; an add-on that is always on shows its state. Details open on demand.
 */
export const TraegerAdmin: Story = {
    decorators: [withAddonsRoutes([UserRole.TenantAdmin], TENANT.id)],
    play: async ({ canvas }) => {
        await canvas.findByTestId(`addon-card-${ADDON}-${TENANT.id}`);
        // Re-query on every step: the narrow layout may remount the page once the mobile navigation registers.
        const demo = () => within(canvas.getByTestId(`addon-card-${ADDON}-${TENANT.id}`));
        const notice = () => within(canvas.getByTestId(`addon-card-${NOTICE_ADDON}-${TENANT.id}`));

        await waitFor(() =>
            expect(readmeImage(canvas.getByTestId(`addon-card-${ADDON}-${TENANT.id}`)).naturalWidth).toBeGreaterThan(0),
        );
        await expect(demo().getByRole('heading', { name: 'Demo-Tools' })).toBeVisible();
        await expect(demo().getByRole('switch', { name: /^(Aktiv|Active)$/ })).toBeChecked();
        await expect(notice().queryByRole('switch')).toBeNull();
        await expect(notice().getByText(/^(Aktiv|Active)$/)).toBeVisible();
        await expect(notice().queryByRole('heading')).toBeNull();
        await expect(demo().getByRole('link', { name: 'Handbuch' })).toHaveAttribute('target', '_blank');

        await userEvent.click(await demo().findByRole('button', { name: /Mehr anzeigen|Show more/ }));
        await expect(demo().getByRole('button', { name: /Weniger anzeigen|Show less/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );

        await expect(demo().queryByRole('tablist')).toBeNull();
        await userEvent.click(demo().getByRole('button', { name: /Details anzeigen|Show details/ }));
        await expect(await demo().findByText(AGENCIES[0].name)).toBeVisible();
        await expect(demo().queryByText(/Beratungsstelle 12/)).toBeNull();

        await userEvent.click(demo().getByRole('tab', { name: /Einstellungen|Settings/ }));
        await waitFor(() => expect(demo().getByDisplayValue('Schön, dass Sie da sind')).toBeVisible());
        await expect(demo().getByRole('switch', { name: 'Erinnerung anzeigen' })).toBeChecked();

        await userEvent.click(demo().getByRole('tab', { name: /Statistik|Statistics/ }));
        await expect(await demo().findByText('128')).toBeVisible();
    },
};

/** Platform admin: readme and global switch on top, then the mode per Träger, then one Träger. */
export const PlatformAdmin: Story = {
    decorators: [withAddonsRoutes(SUPER_ADMIN, 0)],
    play: async ({ canvas, canvasElement }) => {
        await canvas.findByTestId(`addon-info-${ADDON}`);
        await waitFor(() =>
            expect(readmeImage(canvas.getByTestId(`addon-info-${ADDON}`)).naturalWidth).toBeGreaterThan(0),
        );
        const info = canvas.getByTestId(`addon-info-${ADDON}`);
        await expect(within(info).getByRole('switch', { name: /Global aktiv|Active globally/ })).toBeChecked();
        await expect(within(info).getByRole('heading', { name: 'Demo-Tools' })).toBeVisible();

        await expect(within(info).getByText(/^(Funktionen|Features)$/, { selector: 'span' })).toBeVisible();
        await expect(
            within(info).getByText(/^(Beratende: Seitenleiste im Fall|Counsellors: side panel in the case)$/),
        ).toHaveAttribute('title', 'consultant.session');
        await expect(
            within(info).getByRole('img', { name: /Ziele, (Beratende: Kachel|Counsellors: tile)/ }),
        ).toBeVisible();
        await userEvent.click(within(info).getByRole('button', { name: SCREENSHOT_CAPTION }));
        const preview = await within(canvasElement.ownerDocument.body).findByRole('dialog');
        await waitFor(() =>
            expect(preview.querySelector('img.ant-image-preview-img')).toHaveAttribute('alt', SCREENSHOT_CAPTION),
        );
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(preview).not.toBeVisible());

        const table = await canvas.findByTestId('addon-tenants');
        const rowOf = async (name: string) =>
            (await within(table).findByText(new RegExp(`^${name} \\(`))).closest('tr') as HTMLElement;
        const demoRow = await rowOf(TENANT.name);
        await expect(within(demoRow).getByText(/Träger: an|Organisation: on/)).toBeVisible();
        await expect(within(table).queryByRole('switch')).toBeNull();

        const diakonie = await rowOf(TENANTS[2].name);
        await pickOption(
            canvasElement,
            within(diakonie).getByRole('combobox'),
            /^(Träger entscheidet|Organisation decides)$/,
        );
        await waitFor(async () =>
            expect(within(await rowOf(TENANTS[2].name)).getByText(/Träger: aus|Organisation: off/)).toBeVisible(),
        );

        await userEvent.click(
            within(demoRow).getByRole('button', { name: new RegExp(`${TENANT.name} \\(${TENANT.id}\\)`) }),
        );
        const card = await canvas.findByTestId(`addon-card-${ADDON}-${TENANT.id}`);
        await expect(within(card).getByText(`${TENANT.name} (${TENANT.id})`)).toBeVisible();
        await expect(await within(card).findByText(AGENCIES[0].name)).toBeVisible();
        // Add-on pages act for the caller's own Träger, so a picked Träger offers none.
        await expect(within(card).queryByRole('tab', { name: /^(Auswertung|Report)$/ })).toBeNull();
    },
};

/** An add-on without a readme shows no description block, only its facts. */
export const PlatformAdminWithoutReadme: Story = {
    parameters: { msw: { handlers: [...backendWithoutReadme.handlers, bundleHandler] } },
    decorators: [withAddonsRoutes(SUPER_ADMIN, 0)],
    play: async ({ canvas }) => {
        const info = await canvas.findByTestId(`addon-info-${ADDON}`);
        await expect(within(info).getByText('Auswertung')).toBeVisible();
        await expect(within(info).queryByRole('heading', { name: 'Demo-Tools' })).toBeNull();
        await expect(within(info).queryByRole('img', { name: 'Zielübersicht im Beratungsportal' })).toBeNull();
        await expect(within(info).queryByRole('button', { name: /Mehr anzeigen|Show more/ })).toBeNull();
    },
};

/** The AddonService is optional: when it is not deployed the section is empty, not an error. */
export const ServiceNotDeployed: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/addons/registry', () => new HttpResponse(null, { status: 404 })),
                http.get('*/service/addons/admin/addons', () => new HttpResponse(null, { status: 404 })),
            ],
        },
    },
    decorators: [withAddonsRoutes(SUPER_ADMIN, 0)],
    play: async ({ canvas }) => {
        await expect(await canvas.findByText(/Keine Add-ons verfügbar|No add-ons available/)).toBeVisible();
        await expect(canvas.queryByRole('alert')).toBeNull();
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
