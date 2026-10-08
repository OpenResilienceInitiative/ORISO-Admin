import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../App';
import { UserRole } from '../../enums/UserRole';

const mocks = vi.hoisted(() => ({ loading: false, error: false, active: false, setup: vi.fn() }));
vi.mock('../../hooks/useUserData.hook', () => ({
    useUserData: () => ({
        isLoading: mocks.loading,
        isError: mocks.error,
        data: mocks.error || mocks.loading ? undefined : { twoFactorAuth: { isActive: mocks.active } },
    }),
}));
vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: (roles: string | string[]) =>
            (Array.isArray(roles) ? roles : [roles]).includes('restricted-agency-admin'),
        roles: [UserRole.RestrictedAgencyAdmin],
        isSuperAdmin: false,
        isTechnicalAccount: false,
        tokenUnreadable: false,
    }),
}));
vi.mock('../../hooks/usePublicTenantData.hook', () => ({ usePublicTenantData: () => ({ data: {}, isFetched: true }) }));
vi.mock('../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: {}, isLoading: false }) }));
vi.mock('../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => false }) }));
vi.mock('../../hooks/useReleasesToggle.hook', () => ({ useReleasesToggle: () => ({ isEnabled: () => false }) }));
vi.mock('../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: {} }) }));
vi.mock('../../hooks/useAdminTheme.hook', () => ({ useAdminTheme: () => {} }));
vi.mock('../../hooks/useAccountInactivityActivity.hook', () => ({ useAccountInactivityActivity: () => {} }));
vi.mock('../../context/FeatureContext', () => ({
    FeatureProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../components/DpaBlocker/DpaBlockerGate', () => ({
    DpaBlockerGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../components/Layout/ProtectedPageLayoutWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../components/TenantFavicon/TenantFavicon', () => ({ TenantFavicon: () => null }));
vi.mock('../../components/Layout/Initialization', () => ({ Initialization: () => <div>Loading profile</div> }));
vi.mock('../Profile/MandatoryTwoFactorSetup', () => ({ MandatoryTwoFactorSetup: () => <h1>Verify second factor</h1> }));
vi.mock('../lazyPages', async () => ({
    ...(await vi.importActual<typeof import('../lazyPages')>('../lazyPages')),
    LazyAgencySetupPage: () => {
        mocks.setup();
        return <h1>Centre setup</h1>;
    },
}));

const renderSetup = () =>
    render(
        <MemoryRouter initialEntries={['/admin/agency/5/setup']}>
            <App />
        </MemoryRouter>,
    );

describe('the setup route remains behind the existing mandatory second-factor gate', () => {
    it.each(['loading', 'error', 'inactive'] as const)('does not render setup with %s factor evidence', (state) => {
        mocks.setup.mockClear();
        mocks.loading = state === 'loading';
        mocks.error = state === 'error';
        mocks.active = false;
        renderSetup();
        expect(mocks.setup).not.toHaveBeenCalled();
        expect(screen.queryByRole('heading', { name: 'Centre setup' })).not.toBeInTheDocument();
    });
    it('renders the protected setup only after active factor readback', () => {
        mocks.setup.mockClear();
        mocks.loading = false;
        mocks.error = false;
        mocks.active = true;
        renderSetup();
        expect(screen.getByRole('heading', { name: 'Centre setup' })).toBeInTheDocument();
    });
});
