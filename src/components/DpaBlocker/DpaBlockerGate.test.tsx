import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserRole } from '../../enums/UserRole';
import { TenantDpaStatus } from '../../types/dpa';
import { DpaBlockerGate } from './DpaBlockerGate';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const mocks = vi.hoisted(() => ({
    getDpaStatus: vi.fn(),
    getDpaVersions: vi.fn(),
    signDpaAdmin: vi.fn(),
    logout: vi.fn(),
    roleState: {
        roles: ['tenant-admin'],
        isSuperAdmin: false,
        tenantId: 21 as number | null,
        tokenUnreadable: false,
    },
}));

vi.mock('../../api/tenant/getDpaStatus', () => ({
    getDpaStatus: mocks.getDpaStatus,
}));

vi.mock('../../api/tenant/getDpaVersions', () => ({
    getDpaVersions: mocks.getDpaVersions,
}));

vi.mock('../../api/tenant/signDpaAdmin', () => ({
    signDpaAdmin: mocks.signDpaAdmin,
}));

vi.mock('../../api/auth/logout', () => ({
    default: mocks.logout,
}));

vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: mocks.roleState.roles,
        hasRole: (role: UserRole | UserRole[]) => {
            const wanted = Array.isArray(role) ? role : [role];
            return mocks.roleState.roles.some((r) => wanted.includes(r as UserRole));
        },
        isSuperAdmin: mocks.roleState.isSuperAdmin,
        isTechnicalAccount: false,
        isTenantScopedAdmin:
            mocks.roleState.roles.includes('tenant-admin') &&
            mocks.roleState.tenantId !== null &&
            mocks.roleState.tenantId > 0,
        tenantId: mocks.roleState.tenantId,
        tokenUnreadable: mocks.roleState.tokenUnreadable,
    }),
}));

const statusInfo = (status: TenantDpaStatus) => ({
    tenantId: 21,
    status,
    currentDpaVersion: '2026-07-01T12:00:00',
});

const PUBLISHED_VERSION = {
    activationDate: '2026-07-01T12:00:00',
    content: JSON.stringify({ de: '<p>AVV-Text des Betreibers</p>' }),
};

const ADMIN_ROUTES = ['/admin/tenants', '/admin/users/consultants', '/admin/theme-settings/legal', '/admin/statistic'];

const renderGate = (route = '/admin/tenants') => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>
                <DpaBlockerGate>
                    <Routes>
                        <Route path="*" element={<div data-testid="admin-page">admin page content</div>} />
                    </Routes>
                </DpaBlockerGate>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe('DpaBlockerGate', () => {
    beforeEach(() => {
        mocks.getDpaStatus.mockReset();
        mocks.getDpaVersions.mockReset();
        mocks.signDpaAdmin.mockReset();
        mocks.logout.mockReset();
        mocks.roleState.roles = ['tenant-admin'];
        mocks.roleState.isSuperAdmin = false;
        mocks.roleState.tenantId = 21;
        mocks.roleState.tokenUnreadable = false;
        mocks.getDpaVersions.mockResolvedValue([PUBLISHED_VERSION]);
    });

    it('FAILS CLOSED for a tenant admin without a usable tenantId claim (#569 hardening)', async () => {
        mocks.roleState.tenantId = null;

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
        // No tenant to ask about — the block comes from the indeterminate token.
        expect(mocks.getDpaStatus).not.toHaveBeenCalled();
    });

    it('FAILS CLOSED when the access token is malformed/undecodable', async () => {
        mocks.roleState.roles = [];
        mocks.roleState.tenantId = null;
        mocks.roleState.tokenUnreadable = true;

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
        expect(mocks.getDpaStatus).not.toHaveBeenCalled();
    });

    it.each(ADMIN_ROUTES)('blocker wins over the route %s while the DPA is unsigned', async (route) => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));

        renderGate(route);

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
    });

    it('renders the route content when the current DPA version is signed', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('VALID'));

        renderGate();

        expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
        expect(screen.queryByTestId('dpa-blocker')).not.toBeInTheDocument();
    });

    it('leaks no route content while the status is still unresolved', async () => {
        mocks.getDpaStatus.mockReturnValue(new Promise(() => {}));

        renderGate();

        expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dpa-blocker')).not.toBeInTheDocument();
    });

    it('does not gate the platform super admin and never queries the status', async () => {
        mocks.roleState.roles = ['tenant-admin', 'agency-admin'];
        mocks.roleState.isSuperAdmin = true;
        mocks.roleState.tenantId = 0;

        renderGate();

        expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
        expect(mocks.getDpaStatus).not.toHaveBeenCalled();
    });

    it('does not gate non-tenant-admin roles', async () => {
        mocks.roleState.roles = ['agency-admin'];

        renderGate();

        expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
        expect(mocks.getDpaStatus).not.toHaveBeenCalled();
    });

    it('shows the signable blocker with the published DPA text for OUTDATED', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('OUTDATED'));

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.getByText('dpaBlocker.intro.OUTDATED')).toBeInTheDocument();
        expect(await screen.findByTestId('dpa-text')).toHaveTextContent('AVV-Text des Betreibers');
        expect(screen.getByRole('button', { name: 'dpaBlocker.sign.submit' })).toBeInTheDocument();
    });

    it('shows the MISSING state without a sign form', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('MISSING'));

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.getByText('dpaBlocker.intro.MISSING')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'dpaBlocker.sign.submit' })).not.toBeInTheDocument();
        expect(mocks.getDpaVersions).not.toHaveBeenCalled();
    });

    it('shows the distinct INCONSISTENT state without a sign form', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('INCONSISTENT'));

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.getByText('dpaBlocker.intro.INCONSISTENT')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'dpaBlocker.sign.submit' })).not.toBeInTheDocument();
    });

    it('fails closed with a retry state when the status request errors', async () => {
        mocks.getDpaStatus.mockRejectedValue(new Error('CATCH_ALL'));

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.getByText('dpaBlocker.intro.STATUS_UNAVAILABLE')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'dpaBlocker.retry' })).toBeInTheDocument();
    });

    it('retries the status check from the blocker and unlocks on VALID', async () => {
        mocks.getDpaStatus.mockRejectedValueOnce(new Error('CATCH_ALL')).mockResolvedValue(statusInfo('VALID'));
        const user = userEvent.setup();

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'dpaBlocker.retry' }));

        expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
    });

    it('signing the DPA lifts the block permanently', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));
        mocks.signDpaAdmin.mockResolvedValue(statusInfo('VALID'));
        const user = userEvent.setup();

        renderGate();

        expect(await screen.findByTestId('dpa-text')).toBeInTheDocument();

        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerName'), 'Toni Tenantadmin');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerEmail'), 'toni@example.org');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerNote'), 'Vertretungsberechtigt laut Satzung');
        await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));
        await user.click(screen.getByRole('button', { name: 'dpaBlocker.sign.submit' }));

        expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
        expect(screen.queryByTestId('dpa-blocker')).not.toBeInTheDocument();
        expect(mocks.signDpaAdmin).toHaveBeenCalledWith(21, {
            signerName: 'Toni Tenantadmin',
            signerPosition: 'Geschäftsführung',
            signerEmail: 'toni@example.org',
            signerOrganisation: 'Vertretungsberechtigt laut Satzung',
            accepted: true,
            language: 'de',
        });
    });

    // The fourth slot used to demand the organisation a second time and blocked the
    // signature until it was retyped. It is a free note now, so leaving it empty must
    // not stand between a tenant admin and their own admin area.
    it('signs with the note left empty', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));
        mocks.signDpaAdmin.mockResolvedValue(statusInfo('VALID'));
        const user = userEvent.setup();

        renderGate();

        expect(await screen.findByTestId('dpa-text')).toBeInTheDocument();

        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerName'), 'Toni Tenantadmin');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerEmail'), 'toni@example.org');
        await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));
        await user.click(screen.getByRole('button', { name: 'dpaBlocker.sign.submit' }));

        expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
        expect(mocks.signDpaAdmin).toHaveBeenCalledWith(21, {
            signerName: 'Toni Tenantadmin',
            signerPosition: 'Geschäftsführung',
            signerEmail: 'toni@example.org',
            signerOrganisation: '',
            accepted: true,
            language: 'de',
        });
    });

    it('refuses to submit without the explicit acceptance', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));
        const user = userEvent.setup();

        renderGate();

        expect(await screen.findByTestId('dpa-text')).toBeInTheDocument();

        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerName'), 'Toni Tenantadmin');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerEmail'), 'toni@example.org');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerNote'), 'Vertretungsberechtigt laut Satzung');
        await user.click(screen.getByRole('button', { name: 'dpaBlocker.sign.submit' }));

        expect(await screen.findByText('tenantOnboarding.dpa.acceptRequired')).toBeInTheDocument();
        expect(mocks.signDpaAdmin).not.toHaveBeenCalled();
    });

    it('shows an inline error and keeps the block when signing fails', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));
        mocks.signDpaAdmin.mockRejectedValue(new Error('CATCH_ALL'));
        const user = userEvent.setup();

        renderGate();

        expect(await screen.findByTestId('dpa-text')).toBeInTheDocument();

        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerName'), 'Toni Tenantadmin');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerEmail'), 'toni@example.org');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerNote'), 'Vertretungsberechtigt laut Satzung');
        await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));
        await user.click(screen.getByRole('button', { name: 'dpaBlocker.sign.submit' }));

        expect(await screen.findByText('dpaBlocker.sign.error')).toBeInTheDocument();
        expect(screen.getByTestId('dpa-blocker')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
    });

    it('offers logout from the blocker', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));
        const user = userEvent.setup();

        renderGate();

        expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'dpaBlocker.logout' }));

        expect(mocks.logout).toHaveBeenCalledWith(true);
    });

    it('scroll-locks the app behind the overlay while blocked', async () => {
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));

        const { unmount } = renderGate();

        await screen.findByTestId('dpa-blocker');
        expect(document.body.style.overflow).toBe('hidden');

        unmount();
        expect(document.body.style.overflow).not.toBe('hidden');
    });
});
