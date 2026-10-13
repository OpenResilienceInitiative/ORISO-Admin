import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import { transferableAbortController } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { message, Modal, notification } from 'antd';
import type { TenantAdminData } from '../../../../types/TenantAdminData';
import { SmtpSettings } from './index';

const t = (key: string) => key;
vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'de' } }),
}));
vi.mock('i18next', () => ({ default: { language: 'de', resolvedLanguage: 'de' } }));
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { globalFeatureSystemNotificationEmailsEnabled: true } }),
}));
vi.mock('../../../../api/auth/auth', () => ({
    getAccessTokenForRequests: () => 'SYNTHETIC-TEST-ACCESS-TOKEN',
    tryRefreshAccessToken: vi.fn(),
}));
vi.mock('../../../../api/auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../../../utils/generateCsrfToken', () => ({ default: () => 'SYNTHETIC-TEST-CSRF' }));
vi.mock('../../../../appConfig', () => ({
    default: { login: '/admin/login' },
    tenantAdminEndpoint: 'https://admin.example.test/service/tenantadmin',
    tenantEndpoint: 'https://admin.example.test/service/tenant/',
    CSRF_WHITELIST_HEADER: '',
}));

const savedTenant = (): TenantAdminData => ({
    id: 42,
    name: 'Synthetic tenant',
    isSuperAdmin: false,
    userRoles: [],
    adminEmails: [],
    settings: {
        smtpMode: 'OWN',
        smtp: {
            enabled: true,
            host: 'own.smtp.example.test',
            port: 587,
            secure: false,
            username: 'synthetic-smtp-user',
            passwordSet: true,
            from: 'sender@example.test',
            emailThemeColor: '#145080',
        },
        featureAnonymousChatEnabled: true,
        activeLanguages: ['de', 'en'],
    },
    theming: { logo: 'tenant-logo.png', favicon: '', primaryColor: '#145080', secondaryColor: '#ffffff' },
    content: {
        impressum: { de: 'Maintained imprint' },
        privacy: { de: 'Maintained privacy' },
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
});

let client: QueryClient;
let tenant: TenantAdminData;
let requests: Request[];
const writeRequests = () => requests.filter((request) => request.method !== 'GET');

beforeEach(() => {
    tenant = savedTenant();
    requests = [];
    client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
    });
    vi.spyOn(message, 'success').mockImplementation(vi.fn());
    vi.spyOn(notification, 'success').mockImplementation(vi.fn());
    vi.stubGlobal('AbortController', function NativeRequestAbortController() {
        return transferableAbortController();
    });
    vi.stubGlobal(
        'fetch',
        vi.fn(async (request: Request) => {
            requests.push(request);
            return request.method === 'GET'
                ? new Response(JSON.stringify(tenant), { status: 200, headers: { 'Content-Type': 'application/json' } })
                : new Response(null, { status: 204 });
        }),
    );
});

afterEach(() => {
    Modal.destroyAll();
    client.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const renderStoredSettings = () => {
    client.setQueryData(['TENANT', 42], tenant);
    return render(
        <QueryClientProvider client={client}>
            <SmtpSettings tenantId="42" />
        </QueryClientProvider>,
    );
};

const requestUnusualTransportSave = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'tenants.appSettings.smtp.port' }), {
        target: { value: '2525' },
    });
    fireEvent.click(screen.getByText('card.edit.save'));
    await screen.findByRole('dialog', { name: 'tenants.appSettings.smtp.transportMismatchTitle' });
    expect(writeRequests()).toHaveLength(0);
};

describe('OWN transport decisions through the real component, mutation, serializer and HTTP', () => {
    it('keeps an unusual transport draft when confirmation is cancelled without writing', async () => {
        renderStoredSettings();
        await requestUnusualTransportSave();
        fireEvent.click(screen.getByRole('button', { name: 'tenants.appSettings.smtp.transportMismatchCancel' }));

        await waitFor(() =>
            expect(
                screen.queryByRole('dialog', { name: 'tenants.appSettings.smtp.transportMismatchTitle' }),
            ).not.toBeInTheDocument(),
        );
        expect(screen.getByRole('spinbutton', { name: 'tenants.appSettings.smtp.port' })).toHaveValue(2525);
        expect(writeRequests()).toHaveLength(0);
    });

    it('sends the explicit acknowledgement in the actual tenant PUT only after confirmation', async () => {
        renderStoredSettings();
        await requestUnusualTransportSave();
        fireEvent.click(screen.getByRole('button', { name: 'tenants.appSettings.smtp.transportMismatchConfirm' }));

        await waitFor(() => expect(writeRequests()).toHaveLength(1));
        const put = writeRequests()[0];
        expect(put.method).toBe('PUT');
        expect(put.url).toBe('https://admin.example.test/service/tenantadmin/42');
        const body = JSON.parse(await put.text()) as TenantAdminData;
        expect(body.settings.smtpMode).toBe('OWN');
        expect(body.settings.smtp).toMatchObject({ port: 2525, secure: false, nonstandardTransportConfirmed: true });
        expect(body.settings.featureAnonymousChatEnabled).toBe(true);
        expect(body.settings.activeLanguages).toEqual(['de', 'en']);
        expect(body.content.impressum).toEqual({ de: 'Maintained imprint' });
        expect(body.theming).toEqual(savedTenant().theming);
        expect(body.settings.smtp.password).toBe('');
    });

    it('tests the stored server without sending changed draft fields or a recipient', async () => {
        renderStoredSettings();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        fireEvent.change(screen.getByLabelText('tenants.appSettings.smtp.host'), {
            target: { value: 'unsaved.example.test' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'tenants.appSettings.smtp.test.button' }));

        await waitFor(() => expect(writeRequests()).toHaveLength(1));
        const post = writeRequests()[0];
        expect(post.method).toBe('POST');
        expect(post.url).toBe('https://admin.example.test/service/tenant/42/smtp-test-deliveries');
        expect(await post.text()).toBe('');
        expect(requests.some((request) => request.method === 'PUT')).toBe(false);
        await waitFor(() => expect(message.success).toHaveBeenCalledWith('tenants.appSettings.smtp.test.success'));
    });

    it.each([
        [403, 'tenants.appSettings.smtp.test.errorVerifiedEmail'],
        [404, 'tenants.appSettings.smtp.test.error'],
        [422, 'tenants.appSettings.smtp.test.errorConfiguration'],
        [429, 'tenants.appSettings.smtp.test.errorCooldown'],
        [502, 'tenants.appSettings.smtp.test.errorDelivery'],
    ])('explains a %i test response in place', async (status, key) => {
        vi.spyOn(message, 'error').mockImplementation(vi.fn());
        vi.mocked(fetch).mockImplementation(async (request: Request) => {
            requests.push(request);
            return request.method === 'GET'
                ? new Response(JSON.stringify(tenant), { status: 200, headers: { 'Content-Type': 'application/json' } })
                : new Response(null, { status, headers: status === 429 ? { 'Retry-After': '60' } : {} });
        });
        const page = window.location.href;
        renderStoredSettings();
        fireEvent.click(screen.getByRole('button', { name: 'tenants.appSettings.smtp.test.button' }));

        await waitFor(() => expect(message.error).toHaveBeenCalledWith(key));
        expect(message.success).not.toHaveBeenCalled();
        expect(writeRequests()).toHaveLength(1);
        expect(window.location.href).toBe(page);
    });

    it.each(['PLATFORM', 'missing-password'] as const)(
        'does not test %s merely because the editor has draft values',
        (state) => {
            if (state === 'PLATFORM') tenant.settings.smtpMode = 'PLATFORM';
            else tenant.settings.smtp.passwordSet = false;
            renderStoredSettings();

            expect(screen.getByRole('button', { name: 'tenants.appSettings.smtp.test.button' })).toBeDisabled();
            expect(writeRequests()).toHaveLength(0);
        },
    );
});
