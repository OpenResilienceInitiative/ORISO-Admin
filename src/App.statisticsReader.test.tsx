import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { PropsWithChildren } from 'react';
import { AdminApp } from './AdminApp';
import { queryClient } from './constants/client';
import { UserRole } from './enums/UserRole';
import { setStoryAuth } from './utils/storybook/adminStoryDecorators';
import { clearSessionTokens } from './api/auth/tokenSessionStore';

/**
 * ORISO-UserService#1666: App as a Statistik-Leser·in sees it. The real AdminApp, router, role
 * parsing, permission map and the reader's route table are mounted; only the session bootstrap,
 * the shell and the page bodies are stubbed, so the assertions are about where the reader lands.
 */
const mocks = vi.hoisted(() => ({
    getPublicTenantData: vi.fn(),
    apiServerSettings: vi.fn(),
    userData: { twoFactorAuth: { isActive: true } } as Record<string, unknown>,
}));

vi.mock('./api/tenant/getPublicTenantData', () => ({ default: mocks.getPublicTenantData }));
vi.mock('./api/settings/apiServerSettings', () => ({ apiServerSettings: mocks.apiServerSettings }));
vi.mock('./router/ProtectedRoute', () => ({
    ProtectedRoute: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./components/Layout/ProtectedPageLayoutWrapper', () => ({
    default: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./components/DpaBlocker/DpaBlockerGate', () => ({
    DpaBlockerGate: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ isLoading: false }),
}));
vi.mock('./hooks/useUserData.hook', () => ({
    useUserData: () => ({ isLoading: false, data: mocks.userData }),
}));
vi.mock('./hooks/useAccountInactivityActivity.hook', () => ({
    useAccountInactivityActivity: () => undefined,
}));
vi.mock('./pages/Profile/MandatoryTwoFactorSetup', () => ({
    MandatoryTwoFactorSetup: () => <h1>Mandatory 2FA setup</h1>,
}));
vi.mock('./pages/lazyPages', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./pages/lazyPages')>()),
    LazyStatistic: () => <h1>Statistics page</h1>,
    LazyUserProfile: () => <h1>Profile page</h1>,
    LazyHomePage: () => <h1>Home page</h1>,
}));

const open = (path: string) => {
    setStoryAuth([UserRole.StatisticsReader], 0);
    window.history.pushState({}, '', path);
    render(<AdminApp />);
};

describe('App for a Statistik-Leser·in (ORISO-UserService#1666)', () => {
    beforeEach(async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        mocks.getPublicTenantData.mockReset();
        mocks.getPublicTenantData.mockResolvedValue({});
        mocks.apiServerSettings.mockReset();
        mocks.apiServerSettings.mockResolvedValue({
            multitenancyWithSingleDomainEnabled: { value: true, readOnly: true },
            mainTenantSubdomainForSingleDomainMultitenancy: { value: 'online-beratung', readOnly: false },
        });
        mocks.userData = { twoFactorAuth: { isActive: true } };
    });
    afterEach(clearSessionTokens);

    it('lands on statistics after login instead of Home', async () => {
        open('/admin');

        expect(await screen.findByRole('heading', { name: 'Statistics page' })).toBeInTheDocument();
        await waitFor(() => expect(window.location.pathname).toBe('/admin/statistic'));
        expect(screen.queryByRole('heading', { name: 'Home page' })).not.toBeInTheDocument();
    });

    it.each(['/admin/home', '/admin/agency', '/admin/users/consultants', '/admin/settings', '/admin/logs'])(
        'redirects the admin address %s to statistics',
        async (path) => {
            open(path);

            expect(await screen.findByRole('heading', { name: 'Statistics page' })).toBeInTheDocument();
            expect(window.location.pathname).toBe('/admin/statistic');
        },
    );

    it('keeps the own profile reachable', async () => {
        open('/admin/profil/');

        expect(await screen.findByRole('heading', { name: 'Profile page' })).toBeInTheDocument();
        expect(window.location.pathname).toBe('/admin/profil/');
    });

    it('holds the reader at the mandatory 2FA setup until a second factor is active', async () => {
        mocks.userData = { twoFactorAuth: { isActive: false } };
        open('/admin/statistic');

        expect(await screen.findByRole('heading', { name: 'Mandatory 2FA setup' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Statistics page' })).not.toBeInTheDocument();
    });
});
