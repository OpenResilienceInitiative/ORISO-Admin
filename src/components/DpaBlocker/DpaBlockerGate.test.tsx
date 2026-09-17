import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    createDpaSignInvite: vi.fn(),
    sendDpaInviteEmail: vi.fn(),
    logout: vi.fn(),
    getUserData: vi.fn(),
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

vi.mock('../../api/tenant/createDpaSignInvite', () => ({
    createDpaSignInvite: mocks.createDpaSignInvite,
    resolveDpaSignLink: (link: string) => link,
}));

vi.mock('../../api/tenant/sendDpaInviteEmail', () => ({
    sendDpaInviteEmail: mocks.sendDpaInviteEmail,
    isDpaInviteEmailDeliveryFailure: (error: unknown) => error instanceof Response && error.status === 502,
}));

vi.mock('../../api/user/getUserData', () => ({
    getUserData: mocks.getUserData,
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

const makeClient = () =>
    new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

const renderGate = (route = '/admin/tenants', queryClient = makeClient()) =>
    render(
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

describe('DpaBlockerGate', () => {
    beforeEach(() => {
        mocks.getDpaStatus.mockReset();
        mocks.getDpaVersions.mockReset();
        mocks.signDpaAdmin.mockReset();
        mocks.createDpaSignInvite.mockReset();
        mocks.createDpaSignInvite.mockResolvedValue({
            signLink: 'https://app.example.org/dpa-sign/minted-token',
            expiresAt: '2026-08-29T14:31:07',
        });
        mocks.sendDpaInviteEmail.mockReset();
        mocks.sendDpaInviteEmail.mockResolvedValue(undefined);
        mocks.logout.mockReset();
        mocks.getUserData.mockReset();
        mocks.getUserData.mockResolvedValue({});
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

    it('prefills the signer with the name and e-mail captured when the admin was created (#990)', async () => {
        mocks.getUserData.mockResolvedValue({
            firstName: 'Toni',
            lastName: 'Tenantadmin',
            email: 'toni@traeger.example',
        });
        const queryClient = makeClient();
        // The app shell has loaded the profile before the gate renders.
        await queryClient.prefetchQuery({ queryKey: ['user-data'], queryFn: mocks.getUserData });
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));

        renderGate('/admin/tenants', queryClient);

        expect(await screen.findByLabelText('tenantOnboarding.dpa.signerName')).toHaveValue('Toni Tenantadmin');
        expect(screen.getByLabelText('tenantOnboarding.dpa.signerEmail')).toHaveValue('toni@traeger.example');
        expect(screen.getByLabelText('tenantOnboarding.dpa.signerPosition')).toHaveValue('');
    });

    it('also prefills from the legacy lowercase name fields (#990)', async () => {
        mocks.getUserData.mockResolvedValue({
            firstname: 'Toni',
            lastname: 'Tenantadmin',
            email: 'toni@traeger.example',
        });
        const queryClient = makeClient();
        await queryClient.prefetchQuery({ queryKey: ['user-data'], queryFn: mocks.getUserData });
        mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));

        renderGate('/admin/tenants', queryClient);

        expect(await screen.findByLabelText('tenantOnboarding.dpa.signerName')).toHaveValue('Toni Tenantadmin');
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

    describe('forwarded-pending lets the Träger admin keep working (#724, #990)', () => {
        // The waiting state is the additive `forwardPending` flag on the status
        // DTO — the enum stays MISSING|UNSIGNED|OUTDATED|VALID|INCONSISTENT.
        const forwarded = (status: TenantDpaStatus) => ({ ...statusInfo(status), forwardPending: true });

        it('opens the admin area once the forward is completed, without repeating it as a notice (#990)', async () => {
            mocks.getDpaStatus.mockResolvedValueOnce(statusInfo('UNSIGNED')).mockResolvedValue(forwarded('UNSIGNED'));
            const user = userEvent.setup();

            renderGate();

            await user.click(await screen.findByRole('button', { name: 'dpaBlocker.forward' }));
            await user.click(await screen.findByRole('button', { name: 'dpaForward.dialog.linkCreate' }));
            await user.click(await screen.findByRole('button', { name: 'dpaForward.dialog.confirm' }));

            expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-blocker')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument();
            expect(mocks.createDpaSignInvite).toHaveBeenCalledTimes(1);
        });

        it('keeps the forward confirmation on screen when the status flips to forwarded mid-dialog (#990)', async () => {
            mocks.getDpaStatus.mockResolvedValueOnce(statusInfo('UNSIGNED')).mockResolvedValue(forwarded('UNSIGNED'));
            const user = userEvent.setup();

            renderGate();

            await user.click(await screen.findByRole('button', { name: 'dpaBlocker.forward' }));
            await user.type(await screen.findByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
            await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));
            await screen.findByTestId('dpa-forward-sent');

            // What the 30 s poll or a tab switch does: the next read reports the forward.
            const callsBefore = mocks.getDpaStatus.mock.calls.length;
            window.dispatchEvent(new Event('visibilitychange'));
            await waitFor(() => expect(mocks.getDpaStatus.mock.calls.length).toBeGreaterThan(callsBefore));

            expect(screen.getByTestId('dpa-forward-sent')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));

            expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument();
        });

        it('shows the waiting notice OVER the admin app instead of locking it (#990)', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));

            renderGate();

            expect(await screen.findByTestId('dpa-pending-dialog')).toBeInTheDocument();
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-blocker')).not.toBeInTheDocument();
        });

        it.each(ADMIN_ROUTES)('renders the route %s behind the waiting notice (#990)', async (route) => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));

            renderGate(route);

            expect(await screen.findByTestId('dpa-pending-dialog')).toBeInTheDocument();
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
        });

        it('"Später" closes the notice and leaves the admin area usable (#990)', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));
            const user = userEvent.setup();

            renderGate();

            await screen.findByTestId('dpa-pending-dialog');
            await user.click(screen.getByRole('button', { name: 'dpaPending.later' }));

            await waitFor(() => expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument());
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
            expect(mocks.logout).not.toHaveBeenCalled();
        });

        it('mints a shareable link on open and offers it copyable', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));

            renderGate();

            await screen.findByTestId('dpa-pending-dialog');
            await waitFor(() =>
                expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(
                    'https://app.example.org/dpa-sign/minted-token',
                ),
            );
            expect(mocks.createDpaSignInvite).toHaveBeenCalledWith(21);
        });

        it('stays usable when the link cannot be minted (send e-mail is still offered)', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));
            mocks.createDpaSignInvite.mockRejectedValue(new Error('CATCH_ALL'));

            renderGate();

            expect(await screen.findByTestId('dpa-pending-link-error')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'dpaPending.resend' })).toBeEnabled();
        });

        it('"E-Mail senden" opens the shared forward dialog and delivers through the authenticated endpoint', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));
            const user = userEvent.setup();

            renderGate();

            await screen.findByTestId('dpa-pending-dialog');
            await user.click(screen.getByRole('button', { name: 'dpaPending.resend' }));

            expect(await screen.findByTestId('dpa-forward-dialog')).toBeInTheDocument();
            await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
            await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

            await screen.findByTestId('dpa-forward-sent');
            expect(mocks.sendDpaInviteEmail).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 21, recipientEmail: 'legal@example.org' }),
            );
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
        });

        it('a failed delivery keeps the link and reports it as mail-not-sent, not as a total failure', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));
            mocks.sendDpaInviteEmail.mockRejectedValue(new Response(null, { status: 502 }));
            const user = userEvent.setup();

            renderGate();

            await screen.findByTestId('dpa-pending-dialog');
            await user.click(screen.getByRole('button', { name: 'dpaPending.resend' }));
            await screen.findByTestId('dpa-forward-dialog');
            await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
            await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

            expect(await screen.findByTestId('dpa-forward-mail-failed')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-forward-send-failed')).not.toBeInTheDocument();
        });

        it('surfaces unexpected delivery API failures instead of reporting a recoverable mail failure', async () => {
            mocks.getDpaStatus.mockResolvedValue(forwarded('UNSIGNED'));
            mocks.sendDpaInviteEmail.mockRejectedValue(new Response(null, { status: 403 }));
            const user = userEvent.setup();

            renderGate();

            await screen.findByTestId('dpa-pending-dialog');
            await user.click(screen.getByRole('button', { name: 'dpaPending.resend' }));
            await screen.findByTestId('dpa-forward-dialog');
            await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
            await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

            expect(await screen.findByTestId('dpa-forward-send-failed')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-forward-mail-failed')).not.toBeInTheDocument();
        });

        it('keeps the hard blocker for the never-forwarded unsigned state (#572 unchanged)', async () => {
            mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));

            renderGate();

            expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
            expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument();
        });

        it('shows neither dialog nor blocker when the DPA was already signed at login', async () => {
            mocks.getDpaStatus.mockResolvedValue({ ...statusInfo('VALID'), forwardPending: true });

            renderGate();

            expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dpa-unlock-dialog')).not.toBeInTheDocument();
            expect(mocks.createDpaSignInvite).not.toHaveBeenCalled();
        });
    });

    describe('signature lands while the tenant waits (JOB8/JOB9)', () => {
        const forwarded = (status: TenantDpaStatus) => ({ ...statusInfo(status), forwardPending: true });

        /** Lets a test flip what the backend answers between two fetches. */
        const serveStatus = () => {
            const state = { value: forwarded('UNSIGNED') as unknown };
            mocks.getDpaStatus.mockImplementation(() =>
                state.value instanceof Error ? Promise.reject(state.value) : Promise.resolve(state.value),
            );
            return state;
        };

        /** What react-query listens to for refetch-on-focus. */
        const returnToTab = () => window.dispatchEvent(new Event('visibilitychange'));

        it('replaces the waiting notice with the signed notice over the app (JOB8, #990)', async () => {
            const backend = serveStatus();

            renderGate();
            await screen.findByTestId('dpa-pending-dialog');

            backend.value = statusInfo('VALID');
            returnToTab();

            expect(await screen.findByTestId('dpa-unlock-dialog')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-pending-dialog')).not.toBeInTheDocument();
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
        });

        it('re-verifies the signature against the backend on click and only then reveals the app (JOB9)', async () => {
            const backend = serveStatus();
            const user = userEvent.setup();

            renderGate();
            await screen.findByTestId('dpa-pending-dialog');
            backend.value = statusInfo('VALID');
            returnToTab();
            await screen.findByTestId('dpa-unlock-dialog');

            const callsBefore = mocks.getDpaStatus.mock.calls.length;
            await user.click(screen.getByRole('button', { name: 'dpaUnlock.action' }));

            await waitFor(() => expect(screen.queryByTestId('dpa-unlock-dialog')).not.toBeInTheDocument());
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
            expect(mocks.getDpaStatus.mock.calls.length).toBeGreaterThan(callsBefore);
        });

        it('brings the waiting notice back and says why when the re-check finds no signature (JOB9)', async () => {
            const backend = serveStatus();
            const user = userEvent.setup();

            renderGate();
            await screen.findByTestId('dpa-pending-dialog');
            backend.value = statusInfo('VALID');
            returnToTab();
            await screen.findByTestId('dpa-unlock-dialog');

            // The client state says "signed" — the backend disagrees.
            backend.value = forwarded('UNSIGNED');
            await user.click(screen.getByRole('button', { name: 'dpaUnlock.action' }));

            expect(await screen.findByTestId('dpa-pending-recheck-rejected')).toBeInTheDocument();
            expect(screen.getByTestId('admin-page')).toBeInTheDocument();
            expect(screen.queryByTestId('dpa-unlock-dialog')).not.toBeInTheDocument();
        });

        it('falls back to the fail-closed blocker when the re-check itself fails (JOB9)', async () => {
            const backend = serveStatus();
            const user = userEvent.setup();

            renderGate();
            await screen.findByTestId('dpa-pending-dialog');
            backend.value = statusInfo('VALID');
            returnToTab();
            await screen.findByTestId('dpa-unlock-dialog');

            backend.value = new Error('CATCH_ALL');
            await user.click(screen.getByRole('button', { name: 'dpaUnlock.action' }));

            expect(await screen.findByText('dpaBlocker.intro.STATUS_UNAVAILABLE')).toBeInTheDocument();
            expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
        });

        it('offers no logout on the signed notice — the app is already open behind it (#990)', async () => {
            const backend = serveStatus();

            renderGate();
            await screen.findByTestId('dpa-pending-dialog');
            backend.value = statusInfo('VALID');
            returnToTab();
            await screen.findByTestId('dpa-unlock-dialog');

            expect(screen.queryByRole('button', { name: 'dpaBlocker.logout' })).not.toBeInTheDocument();
        });
    });

    describe('stale cached status (JOB7.3)', () => {
        it('never serves a cached answer to a new gate mount — it re-asks and shows nothing meanwhile', async () => {
            const client = makeClient();
            mocks.getDpaStatus.mockResolvedValue(statusInfo('VALID'));

            const first = renderGate('/admin/tenants', client);
            expect(await screen.findByTestId('admin-page')).toBeInTheDocument();
            first.unmount();

            mocks.getDpaStatus.mockResolvedValue(statusInfo('UNSIGNED'));
            renderGate('/admin/tenants', client);

            // No flash of the admin app from the cached VALID.
            expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
            expect(await screen.findByTestId('dpa-blocker')).toBeInTheDocument();
        });
    });
});
