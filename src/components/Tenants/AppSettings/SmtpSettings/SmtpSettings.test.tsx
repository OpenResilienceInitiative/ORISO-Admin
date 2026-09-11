import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
                smtp: {
                    enabled: true,
                    host: 'smtp.tenant.org',
                    username: 'tenant-user',
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
});
