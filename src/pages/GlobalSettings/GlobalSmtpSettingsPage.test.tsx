// antd's static `message` API renders through a raw ReactDOM root; without the
// React 19 patch the toasts silently never mount under Vitest (same import in
// the other toast-asserting test files, e.g. AccountInvitesTab.test.tsx).
import '@ant-design/v5-patch-for-react-19';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
    sendGlobalSmtpTestEmail: vi.fn(),
    useAppConfigContext: vi.fn(),
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: mocks.useAppConfigContext,
}));
vi.mock('../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: { email: 'admin@example.org' } }),
}));
vi.mock('../../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api/fetchData')>();
    return { ...actual, fetchData: mocks.fetchData };
});
vi.mock('../../api/settings/apiServerSettings', () => ({
    apiServerSettings: () => Promise.resolve({}),
}));
vi.mock('../../api/settings/sendGlobalSmtpTestEmail', () => ({
    sendGlobalSmtpTestEmail: mocks.sendGlobalSmtpTestEmail,
}));

// eslint-disable-next-line import/first
import { GlobalSmtpSettingsPage } from './index';
// eslint-disable-next-line import/first
import { serverSettingsAdminEndpoint } from '../../appConfig';

/**
 * CTS-C01 follow-up: since the security fix the public settings payload never
 * carries `globalSmtpUsername` / `globalSmtpPassword`. The card must treat the
 * two credential fields as set-only — an empty field means "keep the stored
 * value" and must be OMITTED from the PATCH body (an empty string would wipe
 * the stored credential server-side). The test-mail gate must not require the
 * credentials either: the backend test endpoint reads the STORED credentials
 * and ignores whatever the request carries.
 */
describe('GlobalSmtpSettingsPage (set-only SMTP credentials)', () => {
    const baseSettings = {
        globalFeatureSystemNotificationEmailsEnabled: true,
        globalSmtpEnabled: true,
        globalSmtpHost: 'smtp.example.org',
        globalSmtpPort: '587',
        globalSmtpSecure: true,
        globalSmtpFrom: 'noreply@example.org',
        globalSmtpEmailThemeColor: '#123456',
        legalContentChangesBySingleTenantAdminsAllowed: false,
        mainTenantSubdomainForSingleDomainMultitenancy: 'app',
    };

    const mockAppConfig = (settings: Record<string, unknown>) => {
        mocks.useAppConfigContext.mockReturnValue({
            settings,
            setManualSettings: vi.fn(),
            setServerSettings: vi.fn(),
        });
    };

    const renderPage = () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        return render(
            <QueryClientProvider client={queryClient}>
                <GlobalSmtpSettingsPage />
            </QueryClientProvider>,
        );
    };

    const startEditing = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'edit' }));
    };

    const save = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
    };

    const patchedBody = () => {
        const patchCall = mocks.fetchData.mock.calls.find(([args]) => args.url === serverSettingsAdminEndpoint);
        expect(patchCall).toBeDefined();
        return JSON.parse(patchCall![0].bodyData);
    };

    beforeEach(() => {
        mocks.fetchData.mockReset().mockResolvedValue({});
        mocks.sendGlobalSmtpTestEmail.mockReset().mockResolvedValue({});
        mockAppConfig(baseSettings);
    });

    it('renders the set-only placeholders and help texts for username and password', () => {
        renderPage();

        expect(screen.getByText('globalSettings.smtp.username.helpText')).toBeInTheDocument();
        expect(screen.getByText('globalSettings.smtp.password.helpText')).toBeInTheDocument();
        expect(screen.getByLabelText('globalSettings.smtp.username')).toHaveAttribute(
            'placeholder',
            'globalSettings.smtp.username.placeholder',
        );
        expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveAttribute(
            'placeholder',
            'globalSettings.smtp.password.placeholder',
        );
    });

    it('starts with empty credential fields even though other settings are prefilled', () => {
        renderPage();

        expect(screen.getByLabelText('globalSettings.smtp.username')).toHaveValue('');
        expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue('');
        expect(screen.getByLabelText('globalSettings.smtp.host')).toHaveValue('smtp.example.org');
    });

    it('omits empty credential fields from the PATCH body entirely', async () => {
        const user = userEvent.setup();
        renderPage();

        await startEditing(user);
        const hostField = screen.getByLabelText('globalSettings.smtp.host');
        await user.clear(hostField);
        await user.type(hostField, 'smtp.changed.org');
        await save(user);

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalled());
        const body = patchedBody();
        expect(body).not.toHaveProperty('globalSmtpUsername');
        expect(body).not.toHaveProperty('globalSmtpPassword');
        expect(body.globalSmtpHost).toBe('smtp.changed.org');
    });

    it('sends typed credentials exactly as typed', async () => {
        const user = userEvent.setup();
        renderPage();

        await startEditing(user);
        await user.type(screen.getByLabelText('globalSettings.smtp.username'), 'mailer@example.org');
        await user.type(screen.getByLabelText('globalSettings.smtp.password'), 'S3cret!pass');
        await save(user);

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalled());
        const body = patchedBody();
        expect(body.globalSmtpUsername).toBe('mailer@example.org');
        expect(body.globalSmtpPassword).toBe('S3cret!pass');
    });

    it('treats whitespace-only credentials as "not a change" and omits them from the PATCH body', async () => {
        // Contract: the settings PATCH endpoint (CTS#98, CTS PR #138) treats
        // blank/whitespace-only credential values as "unchanged" — sending
        // "   " would be a server-side no-op while the UI pretended a
        // credential change happened, so the client omits it up front.
        const user = userEvent.setup();
        renderPage();

        await startEditing(user);
        await user.type(screen.getByLabelText('globalSettings.smtp.username'), '   ');
        await save(user);

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalled());
        const body = patchedBody();
        expect(body).not.toHaveProperty('globalSmtpUsername');
        expect(body).not.toHaveProperty('globalSmtpPassword');
    });

    it('clears the credential fields after a successful save so a later unrelated save cannot re-send them', async () => {
        const user = userEvent.setup();
        renderPage();

        await startEditing(user);
        await user.type(screen.getByLabelText('globalSettings.smtp.username'), 'mailer@example.org');
        await user.type(screen.getByLabelText('globalSettings.smtp.password'), 'S3cret!pass');
        await save(user);

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalledTimes(1));
        expect(patchedBody().globalSmtpUsername).toBe('mailer@example.org');

        // The typed credentials must not linger in the DOM after the save.
        await waitFor(() => expect(screen.getByLabelText('globalSettings.smtp.username')).toHaveValue(''));
        expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue('');

        // A follow-up save of an unrelated change must not re-send them.
        await startEditing(user);
        const hostField = screen.getByLabelText('globalSettings.smtp.host');
        await user.clear(hostField);
        await user.type(hostField, 'smtp.other.org');
        await save(user);

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalledTimes(2));
        const secondBody = JSON.parse(mocks.fetchData.mock.calls[1][0].bodyData);
        expect(secondBody).not.toHaveProperty('globalSmtpUsername');
        expect(secondBody).not.toHaveProperty('globalSmtpPassword');
        expect(secondBody.globalSmtpHost).toBe('smtp.other.org');
    });

    it('sends the test email without credentials in the form — the backend uses the stored ones', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' }));

        await waitFor(() => expect(mocks.sendGlobalSmtpTestEmail).toHaveBeenCalledTimes(1));
        expect(mocks.sendGlobalSmtpTestEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                host: 'smtp.example.org',
                port: 587,
                from: 'noreply@example.org',
                recipientEmail: 'admin@example.org',
            }),
        );
        expect(screen.queryByText('globalSettings.smtp.test.errorMissingConnection')).not.toBeInTheDocument();
    });

    it('still blocks the test email while the connection fields (host/port/from) are missing', async () => {
        mockAppConfig({ ...baseSettings, globalSmtpHost: '' });
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' }));

        expect(await screen.findByText('globalSettings.smtp.test.errorMissingConnection')).toBeInTheDocument();
        expect(mocks.sendGlobalSmtpTestEmail).not.toHaveBeenCalled();
    });

    it("surfaces the server's error message when the test send fails", async () => {
        mocks.sendGlobalSmtpTestEmail.mockRejectedValue(
            new Response(JSON.stringify({ message: 'No SMTP credentials are stored' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' }));

        expect(await screen.findByText('No SMTP credentials are stored')).toBeInTheDocument();
    });
});
