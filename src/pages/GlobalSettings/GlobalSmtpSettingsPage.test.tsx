import '@ant-design/v5-patch-for-react-19';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
    sendGlobalSmtpTestEmail: vi.fn(),
    useAppConfigContext: vi.fn(),
    useUserData: vi.fn(),
}));

vi.mock('../../context/useAppConfig', () => ({ useAppConfigContext: mocks.useAppConfigContext }));
vi.mock('../../hooks/useUserData.hook', () => ({
    useUserData: mocks.useUserData,
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

import { GlobalSmtpSettingsPage } from './index';
import {
    globalSmtpPlatformSettingsEndpoint,
    serverSettingsAdminEndpoint,
    smtpSyncStatusEndpoint,
} from '../../appConfig';

const savedSummary = {
    host: 'smtp.saved.example',
    port: 587,
    secure: true,
    from: 'mail@saved.example',
    configured: true,
    credentialsPresent: true,
};

const renderPage = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return {
        ...render(
            <QueryClientProvider client={queryClient}>
                <GlobalSmtpSettingsPage />
            </QueryClientProvider>,
        ),
        queryClient,
    };
};

describe('GlobalSmtpSettingsPage (saved Admin SMTP)', () => {
    beforeEach(() => {
        mocks.fetchData
            .mockReset()
            .mockImplementation(({ url }) =>
                Promise.resolve(url === globalSmtpPlatformSettingsEndpoint ? savedSummary : {}),
            );
        mocks.sendGlobalSmtpTestEmail.mockReset().mockResolvedValue({});
        mocks.useUserData.mockReturnValue({ data: { email: 'admin@example.org' } });
        mocks.useAppConfigContext.mockReturnValue({
            settings: {
                globalFeatureSystemNotificationEmailsEnabled: true,
                globalSmtpEnabled: true,
                globalSmtpHost: savedSummary.host,
                globalSmtpPort: '587',
                globalSmtpSecure: true,
                globalSmtpFrom: savedSummary.from,
            },
            setManualSettings: vi.fn(),
            setServerSettings: vi.fn(),
        });
    });

    it('shows saved values and offers editable SMTP and empty write-only credential fields', async () => {
        renderPage();
        expect(await screen.findByText(savedSummary.host)).toBeInTheDocument();
        expect(screen.getByLabelText('globalSettings.smtp.host')).toHaveValue(savedSummary.host);
        expect(screen.getByLabelText('globalSettings.smtp.username')).toHaveValue('');
        expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue('');
    });

    it('shows persisted pending Keycloak synchronization without blocking a platform SMTP test', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 3, appliedRevision: 2, status: 'SMTP_SYNC_PENDING' });
            return Promise.resolve({});
        });
        renderPage();

        expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeEnabled();
    });

    it('keeps the saved-but-pending notice when a status read still reports the previous revision', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 3, appliedRevision: 3, status: 'APPLIED' });
            if (url === serverSettingsAdminEndpoint)
                return Promise.resolve(
                    new Response(null, {
                        status: 204,
                        headers: { 'X-Smtp-Sync-Status': 'SMTP_SYNC_PENDING', 'X-Smtp-Revision': '4' },
                    }),
                );
            return Promise.resolve({});
        });
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.type(screen.getByLabelText('globalSettings.smtp.password'), 'new-password-fixture');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();
        expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeEnabled();
        expect(screen.queryByText('globalSettings.smtp.sync.applied')).not.toBeInTheDocument();
    });

    it('tells the admin after a pending save that the mail settings apply within about 5 minutes', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 3, appliedRevision: 3, status: 'APPLIED' });
            if (url === serverSettingsAdminEndpoint)
                return Promise.resolve(
                    new Response(null, {
                        status: 204,
                        headers: { 'X-Smtp-Sync-Status': 'SMTP_SYNC_PENDING', 'X-Smtp-Revision': '4' },
                    }),
                );
            return Promise.resolve({});
        });
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(await screen.findByText('globalSettings.smtp.sync.savedPendingSnackbar')).toBeInTheDocument();
        expect(screen.queryByText('message.success.setting.update')).not.toBeInTheDocument();
    });

    it('rechecks a pending synchronization every 30 seconds until it is applied, without a reload', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            let syncState = { revision: 3, appliedRevision: 2, status: 'SMTP_SYNC_PENDING' };
            mocks.fetchData.mockImplementation(({ url }) => {
                if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
                if (url === smtpSyncStatusEndpoint) return Promise.resolve(syncState);
                return Promise.resolve({});
            });
            const statusReads = () =>
                mocks.fetchData.mock.calls.filter(([args]) => args.url === smtpSyncStatusEndpoint).length;
            renderPage();
            expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();
            expect(statusReads()).toBe(1);

            await vi.advanceTimersByTimeAsync(30_000);
            await waitFor(() => expect(statusReads()).toBe(2));
            expect(screen.getByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();

            syncState = { revision: 3, appliedRevision: 3, status: 'APPLIED' };
            await vi.advanceTimersByTimeAsync(30_000);
            expect(await screen.findByText('globalSettings.smtp.sync.applied')).toBeInTheDocument();
            expect(statusReads()).toBe(3);

            await vi.advanceTimersByTimeAsync(90_000);
            expect(statusReads()).toBe(3);
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps rechecking after a pending save while the status still reports the previous revision', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            let syncState = { revision: 3, appliedRevision: 3, status: 'APPLIED' };
            mocks.fetchData.mockImplementation(({ url }) => {
                if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
                if (url === smtpSyncStatusEndpoint) return Promise.resolve(syncState);
                if (url === serverSettingsAdminEndpoint)
                    return Promise.resolve(
                        new Response(null, {
                            status: 204,
                            headers: { 'X-Smtp-Sync-Status': 'SMTP_SYNC_PENDING', 'X-Smtp-Revision': '4' },
                        }),
                    );
                return Promise.resolve({});
            });
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            renderPage();
            await screen.findByText(savedSummary.host);
            await user.click(screen.getByRole('button', { name: 'edit' }));
            await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
            expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();

            syncState = { revision: 4, appliedRevision: 4, status: 'APPLIED' };
            await vi.advanceTimersByTimeAsync(30_000);
            expect(await screen.findByText('globalSettings.smtp.sync.applied')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps rechecking after a pending save when status reads fail until one succeeds', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            let statusAvailable = false;
            mocks.fetchData.mockImplementation(({ url }) => {
                if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
                if (url === smtpSyncStatusEndpoint)
                    return statusAvailable
                        ? Promise.resolve({ revision: 4, appliedRevision: 4, status: 'APPLIED' })
                        : Promise.reject(new Error('status unavailable'));
                if (url === serverSettingsAdminEndpoint)
                    return Promise.resolve(
                        new Response(null, {
                            status: 204,
                            headers: { 'X-Smtp-Sync-Status': 'SMTP_SYNC_PENDING', 'X-Smtp-Revision': '4' },
                        }),
                    );
                return Promise.resolve({});
            });
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            renderPage();
            await screen.findByText(savedSummary.host);
            await user.click(screen.getByRole('button', { name: 'edit' }));
            await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
            expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();

            statusAvailable = true;
            await vi.advanceTimersByTimeAsync(30_000);
            expect(await screen.findByText('globalSettings.smtp.sync.applied')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('shows applied only when the persisted status confirms the current revision', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 5, appliedRevision: 5, status: 'APPLIED' });
            return Promise.resolve({});
        });
        const page = renderPage();
        expect(await screen.findByText('globalSettings.smtp.sync.applied')).toBeInTheDocument();

        page.queryClient.setQueryData(['SMTP_SYNC_STATUS'], {
            revision: 6,
            appliedRevision: 5,
            status: 'SMTP_SYNC_PENDING',
        });
        expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();
        expect(screen.queryByText('globalSettings.smtp.sync.applied')).not.toBeInTheDocument();
    });

    it('does not show applied for a malformed status array with an unconfirmed revision', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 6, appliedRevision: 5, status: ['APPLIED'] });
            return Promise.resolve({});
        });
        const page = renderPage();
        await screen.findByText(savedSummary.host);
        await waitFor(() => expect(page.queryClient.getQueryState(['SMTP_SYNC_STATUS'])?.status).toBe('success'));
        expect(screen.queryByText('globalSettings.smtp.sync.applied')).not.toBeInTheDocument();
    });

    it('shows a later pending revision instead of a previous applied save', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 3, appliedRevision: 3, status: 'APPLIED' });
            if (url === serverSettingsAdminEndpoint)
                return Promise.resolve(
                    new Response(null, {
                        status: 204,
                        headers: { 'X-Smtp-Sync-Status': 'APPLIED', 'X-Smtp-Revision': '4' },
                    }),
                );
            return Promise.resolve({});
        });
        const user = userEvent.setup();
        const page = renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        expect(await screen.findByText('globalSettings.smtp.sync.applied')).toBeInTheDocument();

        page.queryClient.setQueryData(['SMTP_SYNC_STATUS'], {
            revision: 5,
            appliedRevision: 4,
            status: 'SMTP_SYNC_PENDING',
        });
        expect(await screen.findByText('globalSettings.smtp.sync.pending')).toBeInTheDocument();
    });

    it('does not claim Keycloak synchronization when a successful save omits its revision header', async () => {
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === globalSmtpPlatformSettingsEndpoint) return Promise.resolve(savedSummary);
            if (url === smtpSyncStatusEndpoint)
                return Promise.resolve({ revision: 2, appliedRevision: 2, status: 'APPLIED' });
            return Promise.resolve(new Response(null, { status: 204, headers: { 'X-Smtp-Sync-Status': 'APPLIED' } }));
        });
        const user = userEvent.setup();
        renderPage();
        await screen.findByText('globalSettings.smtp.sync.applied');
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(await screen.findByText('globalSettings.smtp.sync.unknown')).toBeInTheDocument();
        expect(screen.queryByText('globalSettings.smtp.sync.applied')).not.toBeInTheDocument();
    });

    it('keeps the independent notification switch editable without sending SMTP fields', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText('smtp.saved.example');
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'globalSettings.smtp.systemEmailToggle.title' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() =>
            expect(mocks.fetchData.mock.calls.some(([args]) => args.url === serverSettingsAdminEndpoint)).toBe(true),
        );
        const patch = mocks.fetchData.mock.calls.find(([args]) => args.url === serverSettingsAdminEndpoint)![0];
        expect(JSON.parse(patch.bodyData)).toEqual({
            globalFeatureSystemNotificationEmailsEnabled: false,
            globalSmtpEnabled: true,
            globalSmtpHost: savedSummary.host,
            globalSmtpPort: '587',
            globalSmtpSecure: true,
            globalSmtpFrom: savedSummary.from,
        });
    });

    it('sends only the recipient to the saved-settings test endpoint', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' }));

        await waitFor(() => expect(mocks.sendGlobalSmtpTestEmail).toHaveBeenCalledTimes(1));
        expect(mocks.sendGlobalSmtpTestEmail).toHaveBeenCalledWith({ recipientEmail: 'admin@example.org' });
    });

    it('prefills the recipient when account data arrives after the form mounts', async () => {
        mocks.useUserData.mockReturnValue({ data: undefined });
        const page = renderPage();
        expect(screen.getByRole('textbox', { name: 'globalSettings.smtp.test.recipientEmail' })).toHaveValue('');

        mocks.useUserData.mockReturnValue({ data: { email: 'admin@example.org' } });
        page.rerender(
            <QueryClientProvider client={page.queryClient}>
                <GlobalSmtpSettingsPage />
            </QueryClientProvider>,
        );

        await waitFor(() =>
            expect(screen.getByRole('textbox', { name: 'globalSettings.smtp.test.recipientEmail' })).toHaveValue(
                'admin@example.org',
            ),
        );
    });

    it('blocks testing when the saved summary is unavailable', async () => {
        mocks.fetchData.mockRejectedValue(new Error('unavailable'));
        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('globalSettings.smtp.saved.error');
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeDisabled();
    });

    it('shows the server configuration error from a failed test send', async () => {
        mocks.sendGlobalSmtpTestEmail.mockRejectedValue(
            new Response(JSON.stringify({ message: 'SMTP_HOST is missing' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' }));

        expect(await screen.findByText('SMTP_HOST is missing')).toBeInTheDocument();
    });

    it('blocks dirty fields and preserves them when a save fails', async () => {
        mocks.fetchData.mockImplementation(({ url }) =>
            url === serverSettingsAdminEndpoint
                ? Promise.reject(new Error('save unavailable'))
                : Promise.resolve(savedSummary),
        );
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        const host = screen.getByLabelText('globalSettings.smtp.host');
        await user.clear(host);
        await user.type(host, 'smtp.changed.example');
        const test = screen.getByRole('button', { name: 'globalSettings.smtp.test.button' });
        expect(test).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(host).not.toBeDisabled());
        expect(host).toHaveValue('smtp.changed.example');
        expect(test).toBeDisabled();
        expect(mocks.sendGlobalSmtpTestEmail).not.toHaveBeenCalled();
    });

    it('waits for acknowledged save and refreshed summary before sending a recipient-only test', async () => {
        let finishSave!: (value: object) => void;
        let finishSummary!: (value: typeof savedSummary) => void;
        let reads = 0;
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === serverSettingsAdminEndpoint)
                return new Promise((resolve) => {
                    finishSave = resolve;
                });
            reads += 1;
            return reads === 1
                ? Promise.resolve(savedSummary)
                : new Promise((resolve) => {
                      finishSummary = resolve;
                  });
        });
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        const host = screen.getByLabelText('globalSettings.smtp.host');
        await user.clear(host);
        await user.type(host, 'smtp.changed.example');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        const test = screen.getByRole('button', { name: 'globalSettings.smtp.test.button' });
        expect(test).toBeDisabled();
        finishSave({});
        await waitFor(() => expect(reads).toBe(2));
        expect(test).toBeDisabled();
        finishSummary({ ...savedSummary, host: 'smtp.changed.example' });
        await waitFor(() => expect(test).toBeEnabled());
        await user.click(test);
        await waitFor(() =>
            expect(mocks.sendGlobalSmtpTestEmail).toHaveBeenCalledWith({ recipientEmail: 'admin@example.org' }),
        );
    });

    it('saves nonblank credentials once and clears their DOM fields after acknowledgement', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.type(screen.getByLabelText('globalSettings.smtp.username'), 'updated-user');
        await user.type(screen.getByLabelText('globalSettings.smtp.password'), 'fixture-password');
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue(''));
        expect(screen.getByLabelText('globalSettings.smtp.username')).toHaveValue('');
        const patch = mocks.fetchData.mock.calls.find(([args]) => args.url === serverSettingsAdminEndpoint)![0];
        expect(JSON.parse(patch.bodyData)).toMatchObject({
            globalSmtpUsername: 'updated-user',
            globalSmtpPassword: 'fixture-password',
        });
    });

    it('discards an unsaved credential and allows testing the unchanged saved settings', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.type(screen.getByLabelText('globalSettings.smtp.password'), 'unsaved-fixture');
        await user.click(screen.getByRole('button', { name: 'card.edit.cancel' }));
        expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeEnabled();
    });

    it('hydrates settings arriving after mount without overwriting a touched draft', async () => {
        const context = mocks.useAppConfigContext();
        mocks.useAppConfigContext.mockReturnValue({ ...context, settings: {} });
        const user = userEvent.setup();
        const page = renderPage();
        await screen.findByText(savedSummary.host);
        mocks.useAppConfigContext.mockReturnValue(context);
        const rerender = () =>
            page.rerender(
                <QueryClientProvider client={page.queryClient}>
                    <GlobalSmtpSettingsPage />
                </QueryClientProvider>,
            );
        rerender();
        await waitFor(() => expect(screen.getByLabelText('globalSettings.smtp.host')).toHaveValue(savedSummary.host));
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.clear(screen.getByLabelText('globalSettings.smtp.host'));
        await user.type(screen.getByLabelText('globalSettings.smtp.host'), 'smtp.draft.example');
        mocks.useAppConfigContext.mockReturnValue({
            ...context,
            settings: { ...context.settings, globalSmtpHost: 'smtp.external.example' },
        });
        rerender();
        expect(screen.getByLabelText('globalSettings.smtp.host')).toHaveValue('smtp.draft.example');
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeDisabled();
    });

    it('omits whitespace-only credentials so the stored values are retained', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.type(screen.getByLabelText('globalSettings.smtp.username'), '   ');
        await user.type(screen.getByLabelText('globalSettings.smtp.password'), '   ');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(screen.getByLabelText('globalSettings.smtp.password')).toHaveValue(''));
        const patch = mocks.fetchData.mock.calls.find(([args]) => args.url === serverSettingsAdminEndpoint)![0];
        expect(JSON.parse(patch.bodyData)).not.toHaveProperty('globalSmtpUsername');
        expect(JSON.parse(patch.bodyData)).not.toHaveProperty('globalSmtpPassword');
    });

    it('blocks testing after a successful save if the refreshed saved snapshot is unavailable', async () => {
        let reads = 0;
        mocks.fetchData.mockImplementation(({ url }) => {
            if (url === serverSettingsAdminEndpoint) return Promise.resolve({});
            reads += 1;
            return reads === 1 ? Promise.resolve(savedSummary) : Promise.reject(new Error('snapshot unavailable'));
        });
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'globalSettings.smtp.systemEmailToggle.title' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await screen.findByRole('alert');
        expect(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' })).toBeDisabled();
        expect(mocks.sendGlobalSmtpTestEmail).not.toHaveBeenCalled();
    });

    it('tests saved settings without another save when the identical port is retyped', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        const port = screen.getByRole('spinbutton', { name: 'globalSettings.smtp.port' });
        await user.clear(port);
        await user.type(port, '587');
        const test = screen.getByRole('button', { name: 'globalSettings.smtp.test.button' });
        expect(test).toBeEnabled();
        await user.click(test);
        await waitFor(() =>
            expect(mocks.sendGlobalSmtpTestEmail).toHaveBeenCalledWith({ recipientEmail: 'admin@example.org' }),
        );
        expect(mocks.fetchData.mock.calls.some(([args]) => args.url === serverSettingsAdminEndpoint)).toBe(false);
    });

    it('keeps a cleared or genuinely changed port blocked until it is saved', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText(savedSummary.host);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        const port = screen.getByRole('spinbutton', { name: 'globalSettings.smtp.port' });
        const test = screen.getByRole('button', { name: 'globalSettings.smtp.test.button' });
        await user.clear(port);
        expect(test).toBeDisabled();
        await user.type(port, '588');
        expect(test).toBeDisabled();
        await user.click(test);
        expect(mocks.sendGlobalSmtpTestEmail).not.toHaveBeenCalled();
    });
});
