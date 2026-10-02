import React from 'react';
import { transferableAbortController } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantAdminData } from '../types/TenantAdminData';
import { useTenantAdminDataMutation } from './useTenantAdminDataMutation.hook';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('i18next', () => ({ default: { language: 'de', resolvedLanguage: 'de' } }));
vi.mock('antd', () => ({
    notification: { success: vi.fn(), error: vi.fn() },
    message: { error: vi.fn() },
}));
vi.mock('../api/auth/auth', () => ({
    getAccessTokenForRequests: () => 'SYNTHETIC-TEST-ACCESS-TOKEN',
    tryRefreshAccessToken: vi.fn(),
}));
vi.mock('../api/auth/logout', () => ({ default: vi.fn() }));
vi.mock('../utils/generateCsrfToken', () => ({ default: () => 'SYNTHETIC-TEST-CSRF' }));
vi.mock('../appConfig', () => ({
    default: { login: '/admin/login' },
    tenantAdminEndpoint: 'https://admin.example.test/service/tenantadmin',
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
let currentTenant: TenantAdminData;
let requests: Request[];

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    currentTenant = savedTenant();
    requests = [];
    // Request is Node's native implementation; keep its AbortSignal in the same
    // realm while the hook itself runs in jsdom.
    vi.stubGlobal('AbortController', function NativeRequestAbortController() {
        return transferableAbortController();
    });
    vi.stubGlobal(
        'fetch',
        vi.fn(async (request: Request) => {
            requests.push(request);
            if (request.method === 'GET') {
                return new Response(JSON.stringify(currentTenant), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return new Response(null, { status: 204 });
        }),
    );
});

afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
});

const saveThroughHttp = async (patch: Partial<TenantAdminData>) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTenantAdminDataMutation({ id: 42, prefetchTenantAdminData: false }), {
        wrapper,
    });
    await act(async () => {
        await result.current.mutateAsync(patch);
    });
    expect(requests.map((request) => request.method)).toEqual(['GET', 'PUT']);
    const put = requests[1];
    expect(put.url).toBe('https://admin.example.test/service/tenantadmin/42');
    expect(put.headers.get('Authorization')).toBe('Bearer SYNTHETIC-TEST-ACCESS-TOKEN');
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('SYNTHETIC-TEST-CSRF');
    expect(put.credentials).toBe('include');
    return JSON.parse(await put.text()) as TenantAdminData;
};

describe('tenant SMTP mode through the real mutation, serializer and HTTP request', () => {
    it('sends only the editor platform projection instead of restoring stored OWN fields', async () => {
        const body = await saveThroughHttp({
            settings: { smtpMode: 'PLATFORM', smtp: { enabled: false, emailThemeColor: '#236090' } },
        });

        expect(body.settings.smtpMode).toBe('PLATFORM');
        expect(body.settings.smtp).toEqual({ enabled: false, emailThemeColor: '#236090' });
        expect(body.name).toBe('Synthetic tenant');
        expect(body.settings.featureAnonymousChatEnabled).toBe(true);
        expect(body.settings.activeLanguages).toEqual(['de', 'en']);
        expect(body.content).toEqual({
            impressum: { de: 'Maintained imprint' },
            privacy: { de: 'Maintained privacy' },
            termsAndConditions: {},
            claim: {},
        });
        expect(body.theming).toEqual(savedTenant().theming);
    });

    it('preserves the OWN configuration and its write-only password rotation', async () => {
        const body = await saveThroughHttp({
            settings: { smtpMode: 'OWN', smtp: { password: 'SYNTHETIC-ROTATED-SMTP-PASSWORD' } },
        });

        expect(body.settings.smtpMode).toBe('OWN');
        expect(body.settings.smtp).toEqual({
            ...savedTenant().settings.smtp,
            password: 'SYNTHETIC-ROTATED-SMTP-PASSWORD',
        });
    });

    it('does not erase stored SMTP settings for an unrelated platform-tenant update', async () => {
        currentTenant.settings.smtpMode = 'PLATFORM';
        const body = await saveThroughHttp({ settings: { featureAnonymousChatEnabled: false } });

        expect(body.settings.smtpMode).toBe('PLATFORM');
        expect(body.settings.smtp).toEqual(savedTenant().settings.smtp);
        expect(body.settings.featureAnonymousChatEnabled).toBe(false);
    });

    it('does not infer a projection from a mode-only update', async () => {
        const body = await saveThroughHttp({ settings: { smtpMode: 'PLATFORM' } });

        expect(body.settings.smtpMode).toBe('PLATFORM');
        expect(body.settings.smtp).toEqual(savedTenant().settings.smtp);
    });
});
