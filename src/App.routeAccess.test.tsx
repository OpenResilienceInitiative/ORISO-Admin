import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { App } from './App';
import { clearSessionTokens } from './api/auth/tokenSessionStore';
import { UserRole } from './enums/UserRole';
import { setStoryAuth } from './utils/storybook/adminStoryDecorators';

const fixture = vi.hoisted(() => ({
    topicsEnabled: true,
    mountTenantEditor: vi.fn(),
    mountSettingsLayout: vi.fn(),
}));

vi.mock('./context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: true } }),
}));
vi.mock('./hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ isLoading: false, data: { settings: { featureTopicsEnabled: fixture.topicsEnabled } } }),
}));
vi.mock('./hooks/usePublicTenantData.hook', () => ({ usePublicTenantData: () => ({ isFetched: true }) }));
vi.mock('./hooks/useUserData.hook', () => ({ useUserData: () => ({ data: { twoFactorAuth: { isActive: true } } }) }));
vi.mock('./hooks/useAccountInactivityActivity.hook', () => ({ useAccountInactivityActivity: () => undefined }));
vi.mock('./hooks/useAdminTheme.hook', () => ({ useAdminTheme: () => undefined }));
vi.mock('./hooks/useReleasesToggle.hook', () => ({ useReleasesToggle: () => ({ isEnabled: () => false }) }));
vi.mock('./components/DpaBlocker/DpaBlockerGate', () => ({
    DpaBlockerGate: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./components/Layout/ProtectedPageLayoutWrapper', () => ({
    default: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./pages/ErrorPages/AdminNotFound', () => ({ AdminNotFound: () => <h1>Page not found</h1> }));
vi.mock('./pages/Logs/LogsTabsLayout', () => ({ LogsTabsLayout: () => <Outlet /> }));
vi.mock('./pages/lazyPages', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./pages/lazyPages')>()),
    LazyTenantEditOrAdd: () => {
        fixture.mountTenantEditor();
        return <Outlet />;
    },
    LazyTenantSettingsLayout: () => {
        fixture.mountSettingsLayout();
        return <Outlet />;
    },
    LazyUsersList: () => <h1>Users {useParams().typeOfUsers}</h1>,
    LazyLinksPage: () => <Outlet />,
    LazyLinksIndexRedirect: () => <Navigate to="/admin/links/tenants" replace />,
    LazyTenantInvitesTab: () => <h1>Tenant invites</h1>,
    LazySingleLegalSettings: () => <h1>Tenant legal settings</h1>,
    LazyGeneralTenantSettings: () => <h1>Tenant general settings</h1>,
    LazyTopicList: () => <h1>Tenant topics</h1>,
    LazyTopicSettingsPage: () => <h1>Platform topics</h1>,
    LazyAddonsLayout: () => <Outlet />,
    LazyAddonsOverview: () => <h1>Add-ons overview</h1>,
}));

const centreAdmin = [UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin];
const platformAdmin = [UserRole.AgencyAdmin, UserRole.TenantAdmin];

const open = (path: string, roles: UserRole[], { tenantId = 17, topicsEnabled = true } = {}) => {
    fixture.topicsEnabled = topicsEnabled;
    fixture.mountTenantEditor.mockClear();
    fixture.mountSettingsLayout.mockClear();
    setStoryAuth(roles, tenantId);
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/admin/access-denied" element={<h1>Access denied</h1>} />
                <Route path="*" element={<App />} />
            </Routes>
        </MemoryRouter>,
    );
};

const expectHeading = async (name: string) => {
    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
};

afterEach(clearSessionTokens);

describe('Admin routing for recognised and unavailable pages', () => {
    it.each([
        '/admin/tenants/17/legal-settings',
        '/admin/tenants/17',
        '/admin/tenants',
        '/admin/users/tenants',
        '/admin/theme-settings/master-data',
        '/admin/global-settings/smtp',
        '/admin/logs/inactive-accounts',
        '/admin/logs/deletions',
        '/admin/logs/addons',
        '/admin/addons',
        '/admin/addons/apps/example/17',
        '/admin/topics',
        '/admin/topics/17',
    ])('denies the known URL %s for a centre administrator', async (path) => {
        open(path, centreAdmin);

        await expectHeading('Access denied');
        expect(fixture.mountTenantEditor).not.toHaveBeenCalled();
    });

    it.each(['/admin/unknown', '/admin/tenants/17/unknown', '/admin/addons/unknown', '/admin/theme-settings/unknown'])(
        'keeps the genuine unknown URL %s in the not-found path',
        async (path) => {
            open(path, centreAdmin);

            await expectHeading('Page not found');
        },
    );

    it('keeps tenant legal settings available to a platform administrator', async () => {
        open('/admin/tenants/17/legal-settings', platformAdmin, { tenantId: 0 });

        await expectHeading('Tenant legal settings');
        expect(fixture.mountTenantEditor).toHaveBeenCalled();
    });

    it('keeps the tenant index redirect for a platform administrator', async () => {
        open('/admin/tenants/17', platformAdmin, { tenantId: 0 });

        await expectHeading('Tenant general settings');
    });

    it('keeps the legacy tenant-list tab and its route parameter for a tenant reader', async () => {
        open('/admin/users/tenants', [UserRole.TenantAdmin]);

        await expectHeading('Users tenants');
    });

    it('skips the settings layout when an otherwise eligible reader opens a forbidden settings page', async () => {
        open('/admin/theme-settings/global-config', [UserRole.TenantAdmin]);

        await expectHeading('Access denied');
        expect(fixture.mountSettingsLayout).not.toHaveBeenCalled();
    });

    it('allows a topic administrator to open the enabled tenant topics list', async () => {
        open('/admin/topics', [UserRole.TopicAdmin]);

        await expectHeading('Tenant topics');
    });

    it.each(['/admin/topics', '/admin/topics/17'])('keeps disabled topic route %s unavailable', async (path) => {
        open(path, [UserRole.TopicAdmin], { topicsEnabled: false });

        await expectHeading('Page not found');
    });

    it('keeps the platform topics redirect when tenant topics are disabled', async () => {
        open('/admin/topics', platformAdmin, { tenantId: 0, topicsEnabled: false });

        await expectHeading('Platform topics');
    });

    it('keeps the Add-ons subsection fallback for a role with access', async () => {
        open('/admin/addons/unknown', platformAdmin, { tenantId: 0 });

        await expectHeading('Add-ons overview');
    });

    it('keeps the existing Links subsection fallback for a role with access', async () => {
        open('/admin/links/unknown', centreAdmin);

        await expectHeading('Tenant invites');
    });
});
