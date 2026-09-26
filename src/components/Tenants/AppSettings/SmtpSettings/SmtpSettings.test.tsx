import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modal } from 'antd';

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    tenantData: undefined as any,
    appSettings: {} as any,
}));

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'de' } }),
}));
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: mocks.appSettings }),
}));
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    TENANT_QUERY_KEY: 'TENANT',
    useSingleTenantData: () => ({ data: mocks.tenantData, isLoading: false }),
}));
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: mocks.mutate }),
}));

// eslint-disable-next-line import/first
import { SmtpSettings } from './index';

const renderCard = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <SmtpSettings tenantId="1" />
        </QueryClientProvider>,
    );
};

const passwordInput = () => document.querySelector('input[type="password"]') as HTMLInputElement | null;

describe('SmtpSettings (write-only password, #730)', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.appSettings = {
            globalSmtpHost: 'global.example.org',
            globalSmtpUsername: 'global-user',
            globalSmtpPassword: 'global-secret',
        };
        mocks.tenantData = {
            id: 1,
            settings: {
                smtpMode: 'OWN',
                smtp: {
                    enabled: true,
                    host: 'smtp.tenant.org',
                    port: 587,
                    username: 'tenant-user',
                    from: 'tenant@example.org',
                    passwordSet: true,
                },
            },
        };
    });

    it('renders the password field empty and never leaks a stored or global secret', () => {
        renderCard();

        expect(passwordInput()).not.toBeNull();
        expect(passwordInput()!.value).toBe('');
        expect(document.body.innerHTML).not.toContain('global-secret');
    });

    it('shows the stored indicator when a password is set', () => {
        renderCard();

        expect(screen.getByText('tenants.appSettings.smtp.passwordStored')).toBeInTheDocument();
    });

    it('shows the not-set indicator when no password is stored', () => {
        mocks.tenantData.settings.smtp.passwordSet = false;
        renderCard();

        expect(screen.getByText('tenants.appSettings.smtp.passwordNotSet')).toBeInTheDocument();
    });

    it('treats a legacy backend password value as "stored" without displaying it', () => {
        mocks.tenantData.settings.smtp = {
            enabled: true,
            host: 'smtp.tenant.org',
            password: 'legacy-plaintext',
        };
        renderCard();

        expect(screen.getByText('tenants.appSettings.smtp.passwordStored')).toBeInTheDocument();
        expect(passwordInput()!.value).toBe('');
        expect(document.body.innerHTML).not.toContain('legacy-plaintext');
    });

    it('saves with a blank password so the backend keeps the stored one', async () => {
        renderCard();

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.click(screen.getByText('card.edit.save'));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
        const sent = mocks.mutate.mock.calls[0][0];
        expect(sent.settings.smtp.password).toBe('');
        expect(sent.settings.smtp.host).toBe('smtp.tenant.org');
    });

    it('sends the newly typed password on save', async () => {
        renderCard();

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.change(passwordInput()!, { target: { value: 'rotated-secret' } });
        fireEvent.click(screen.getByText('card.edit.save'));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
        const sent = mocks.mutate.mock.calls[0][0];
        expect(sent.settings.smtp.password).toBe('rotated-secret');
    });

    it('keeps platform SMTP values out of a tenant in platform mode', async () => {
        mocks.tenantData.settings.smtpMode = 'PLATFORM';
        renderCard();

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.click(screen.getByText('card.edit.save'));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
        const sent = mocks.mutate.mock.calls[0][0];
        expect(sent.settings.smtpMode).toBe('PLATFORM');
        expect(sent.settings.smtp).toEqual({ enabled: false, emailThemeColor: '#0f3b8f' });
        expect(JSON.stringify(sent.settings.smtp)).not.toContain('smtp.tenant.org');
        expect(JSON.stringify(sent.settings.smtp)).not.toContain('tenant-user');
        expect(JSON.stringify(sent.settings)).not.toContain('global.example.org');
        expect(JSON.stringify(sent.settings)).not.toContain('global-user');
    });

    it('refuses to save an incomplete own-server configuration', async () => {
        mocks.tenantData.settings.smtp = { enabled: true, host: 'smtp.tenant.org', passwordSet: false };
        renderCard();

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.click(screen.getByText('card.edit.save'));

        expect(await screen.findAllByText('tenants.appSettings.smtp.ownServerIncomplete')).not.toHaveLength(0);
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('requires an explicit choice for an unaudited legacy tenant', async () => {
        delete mocks.tenantData.settings.smtpMode;
        renderCard();

        expect(screen.getByText('tenants.appSettings.smtp.legacyModeMissing')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.click(screen.getByText('card.edit.save'));

        expect(await screen.findByText('form.errors.required')).toBeInTheDocument();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });
});

describe('SmtpSettings (tenant mode is independent of platform SMTP)', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.appSettings = { globalSmtpHost: 'global.example.org', globalSmtpFrom: 'platform@example.org' };
        mocks.tenantData = {
            id: 1,
            settings: { smtpMode: 'OWN', smtp: { enabled: true, host: '', passwordSet: false } },
        };
    });

    const inputByName = (name: string) =>
        document.querySelector(`input[name="${name}"], input[id$="${name}"]`) as HTMLInputElement | null;

    it('does not copy platform SMTP values into tenant settings', () => {
        renderCard();

        const values = Array.from(document.querySelectorAll('input')).map((input) => input.value);
        expect(values).not.toContain('global.example.org');
        expect(values).not.toContain('platform@example.org');
    });

    it('keeps own-server fields editable when platform SMTP is disabled', () => {
        mocks.appSettings = { ...mocks.appSettings, globalSmtpEnabled: false };
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));

        const host = screen.getByRole('textbox', { name: 'tenants.appSettings.smtp.host' });
        expect(host).not.toBeDisabled();
        expect(passwordInput()).not.toBeDisabled();
    });

    it('explains every field and offers no test e-mail on the tenant side', () => {
        renderCard();

        expect(screen.getByText('tenants.appSettings.smtp.description')).toBeInTheDocument();
        expect(screen.getByText('tenants.appSettings.smtp.host.helpText')).toBeInTheDocument();
        expect(screen.getByText('tenants.appSettings.smtp.from.helpText')).toBeInTheDocument();
        expect(screen.getByText('tenants.appSettings.smtp.passwordNotSet')).toBeInTheDocument();
        expect(document.body.innerHTML).not.toContain('smtp.test');
        expect(inputByName('recipientEmail')).toBeNull();
    });
});

describe('SmtpSettings (SMTP transport confirmation, #1061)', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.appSettings = {};
        mocks.tenantData = {
            id: 1,
            settings: {
                smtpMode: 'OWN',
                smtp: {
                    enabled: true,
                    host: 'smtp.tenant.org',
                    port: 587,
                    secure: false,
                    username: 'tenant-user',
                    from: 'tenant@example.org',
                    passwordSet: true,
                },
            },
        };
    });

    it('saves the standard 587/STARTTLS pair without asking for an override', async () => {
        const confirm = vi.spyOn(Modal, 'confirm');
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.click(screen.getByText('card.edit.save'));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(confirm).not.toHaveBeenCalled();
        confirm.mockRestore();
    });

    it.each([
        [465, false],
        [587, true],
        [2525, false],
    ])('requires an explicit choice before saving port %i with secure=%s', async (port, secure) => {
        mocks.tenantData.settings.smtp.port = port;
        mocks.tenantData.settings.smtp.secure = secure;
        const confirm = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
            destroy: vi.fn(),
            update: vi.fn(),
        }));
        renderCard();
        expect(screen.getByText('tenants.appSettings.smtp.transportMismatchHint')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.click(screen.getByText('card.edit.save'));

        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(mocks.mutate).not.toHaveBeenCalled();
        const choice = confirm.mock.calls[0][0];
        choice.onOk?.();
        expect(mocks.mutate).toHaveBeenCalledTimes(1);
        expect(mocks.mutate.mock.calls[0][0].settings.smtp).toMatchObject({ port, secure });
        confirm.mockRestore();
    });

    it('keeps the form open when the user declines a changed transport combination', async () => {
        const confirm = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({
            destroy: vi.fn(),
            update: vi.fn(),
        }));
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: 'tenants.appSettings.smtp.port' }), {
            target: { value: '465' },
        });

        expect(await screen.findByText('tenants.appSettings.smtp.transportMismatchHint')).toBeInTheDocument();
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        act(() => {
            confirm.mock.calls[0][0].onCancel?.();
        });

        expect(mocks.mutate).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(screen.getByRole('spinbutton', { name: 'tenants.appSettings.smtp.port' })).not.toBeDisabled(),
        );
        confirm.mockRestore();
    });
});
