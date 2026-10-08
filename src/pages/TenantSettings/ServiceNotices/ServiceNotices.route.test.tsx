import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const current = vi.hoisted(() => ({
    isSuperAdmin: true,
    isTechnicalAccount: false,
    tokenUnreadable: false,
    http: vi.fn(),
}));
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ ...current, roles: [], hasRole: () => false, tenantId: current.isSuperAdmin ? 0 : 7 }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 0 }, isLoading: false }) }));
vi.mock('../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ isLoading: false, isFetched: true }),
}));
vi.mock('../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: { id: 'operator-fixture' }, isLoading: false }),
}));
vi.mock('../../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: {} }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../hooks/useReleasesToggle.hook', () => ({ useReleasesToggle: () => ({ isEnabled: () => false }) }));
vi.mock('../../../hooks/useAdminTheme.hook', () => ({ useAdminTheme: () => undefined }));
vi.mock('../../../hooks/useAccountInactivityActivity.hook', () => ({ useAccountInactivityActivity: () => undefined }));
vi.mock('../../../utils/adminTwoFactorGate', () => ({
    hasMandatoryTwoFactorRole: () => false,
    requiresMandatoryTwoFactor: () => false,
}));
vi.mock('../../../context/FeatureContext', () => ({
    FeatureProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../components/Layout/ProtectedPageLayoutWrapper', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../components/DpaBlocker/DpaBlockerGate', () => ({
    DpaBlockerGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../components/TenantFavicon/TenantFavicon', () => ({ TenantFavicon: () => null }));
vi.mock('../../../pages/lazyPages', async (original) => ({
    ...(await original<typeof import('../../../pages/lazyPages')>()),
    LazyTenantSettingsLayout: () => <Outlet />,
}));
vi.mock('../../../api/fetchData', async (original) => ({
    ...(await original<typeof import('../../../api/fetchData')>()),
    fetchData: (...args: unknown[]) => current.http(...args),
}));
vi.mock('react-i18next', async (original) => ({
    ...(await original<typeof import('react-i18next')>()),
    useTranslation: () => ({ t: (key: string) => key }),
}));

import { App } from '../../../App';

const Location = () => <output data-testid="location">{useLocation().pathname}</output>;
const renderRoute = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={['/admin/theme-settings/service-notices']}>
                <App />
                <Location />
            </MemoryRouter>
        </QueryClientProvider>,
    );

describe('the real operator service-notice route (#876)', () => {
    it('lets a readable nontechnical platform administrator open an empty no-send draft form', async () => {
        Object.assign(current, { isSuperAdmin: true, isTechnicalAccount: false, tokenUnreadable: false });
        current.http.mockClear();
        renderRoute();
        expect(await screen.findByLabelText('serviceNotices.reference')).toHaveValue('');
        expect(screen.getByLabelText('serviceNotices.statusUrl')).toHaveValue('');
        expect(current.http).not.toHaveBeenCalled();
    });

    it.each([
        { isSuperAdmin: false, isTechnicalAccount: false, tokenUnreadable: false },
        { isSuperAdmin: true, isTechnicalAccount: true, tokenUnreadable: false },
        { isSuperAdmin: true, isTechnicalAccount: false, tokenUnreadable: true },
    ])('denies direct access for the rejected role/token state %j without an operator request', async (role) => {
        Object.assign(current, role);
        current.http.mockClear();
        renderRoute();
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/access-denied'));
        expect(screen.queryByLabelText('serviceNotices.reference')).not.toBeInTheDocument();
        expect(current.http).not.toHaveBeenCalled();
    });
});
