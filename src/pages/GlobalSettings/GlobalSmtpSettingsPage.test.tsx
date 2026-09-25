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
import { globalSmtpPlatformSettingsEndpoint, serverSettingsAdminEndpoint } from '../../appConfig';

const deploymentSummary = {
    host: 'smtp.deployment.example',
    port: 587,
    secure: true,
    from: 'mail@deployment.example',
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

describe('GlobalSmtpSettingsPage (deployment SMTP)', () => {
    beforeEach(() => {
        mocks.fetchData
            .mockReset()
            .mockImplementation(({ url }) =>
                Promise.resolve(url === globalSmtpPlatformSettingsEndpoint ? deploymentSummary : {}),
            );
        mocks.sendGlobalSmtpTestEmail.mockReset().mockResolvedValue({});
        mocks.useUserData.mockReturnValue({ data: { email: 'admin@example.org' } });
        mocks.useAppConfigContext.mockReturnValue({
            settings: {
                globalFeatureSystemNotificationEmailsEnabled: true,
                globalSmtpHost: 'smtp.legacy.example',
                globalSmtpPort: '25',
                globalSmtpFrom: 'old@legacy.example',
            },
            setManualSettings: vi.fn(),
            setServerSettings: vi.fn(),
        });
    });

    it('shows effective deployment values as text and never offers server credential fields', async () => {
        renderPage();

        expect(await screen.findByText('smtp.deployment.example')).toBeInTheDocument();
        expect(screen.getByText('mail@deployment.example')).toBeInTheDocument();
        expect(screen.queryByText('smtp.legacy.example')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('globalSettings.smtp.host')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('globalSettings.smtp.password')).not.toBeInTheDocument();
    });

    it('keeps the independent notification switch editable without sending SMTP fields', async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByText('smtp.deployment.example');
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'globalSettings.smtp.systemEmailToggle.title' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() =>
            expect(mocks.fetchData.mock.calls.some(([args]) => args.url === serverSettingsAdminEndpoint)).toBe(true),
        );
        const patch = mocks.fetchData.mock.calls.find(([args]) => args.url === serverSettingsAdminEndpoint)![0];
        expect(JSON.parse(patch.bodyData)).toEqual({ globalFeatureSystemNotificationEmailsEnabled: false });
    });

    it('sends only the recipient to the deployment-backed test endpoint', async () => {
        const user = userEvent.setup();
        renderPage();
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

    it('shows a read error instead of stale Admin values when the deployment summary is unavailable', async () => {
        mocks.fetchData.mockRejectedValue(new Error('unavailable'));
        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('globalSettings.smtp.deployment.error');
        expect(screen.queryByText('smtp.legacy.example')).not.toBeInTheDocument();
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
        await user.click(screen.getByRole('button', { name: 'globalSettings.smtp.test.button' }));

        expect(await screen.findByText('SMTP_HOST is missing')).toBeInTheDocument();
    });
});
