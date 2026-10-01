import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchData } from '../api/fetchData';
import { TENANT_QUERY_KEY } from './useSingleTenantData';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../api/fetchData', () => ({ fetchData: vi.fn(), FETCH_METHODS: { PUT: 'PUT' } }));

const notifySuccess = vi.hoisted(() => vi.fn());
vi.mock('antd', async () => {
    const antd = await vi.importActual<typeof import('antd')>('antd');
    return { ...antd, notification: { ...antd.notification, success: notifySuccess } };
});

vi.mock('../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: vi.fn(),
}));

import { useTenantAdminDataMutation } from './useTenantAdminDataMutation.hook';
import { getSingleTenantData } from '../api/tenant/getSingleTenantData';
import { TenantAdminData } from '../types/TenantAdminData';

const getSingleTenantDataMock = vi.mocked(getSingleTenantData);

const seedTenantAdminData: TenantAdminData = {
    id: 1,
    name: 'Demo tenant',
    isSuperAdmin: false,
    userRoles: [],
    adminEmails: [],
    settings: { featureAnonymousChatEnabled: true },
    theming: {
        logo: '',
        favicon: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
    },
    content: {
        impressum: {},
        privacy: {},
        termsAndConditions: {},
        claim: {},
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
};

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

beforeEach(() => {
    getSingleTenantDataMock.mockReset();
    vi.mocked(fetchData).mockReset();
    notifySuccess.mockReset();
});

describe('useTenantAdminDataMutation', () => {
    it('omits unchanged null licensing from an SMTP update while retaining it in cache', async () => {
        const seed = { ...seedTenantAdminData, licensing: { allowedNumberOfUsers: null } };
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        vi.mocked(fetchData).mockResolvedValue(seed);
        getSingleTenantDataMock.mockResolvedValue(seed);
        const { result } = renderHook(
            () =>
                useTenantAdminDataMutation({
                    id: '40',
                    seedTenantAdminData: seed,
                    prefetchTenantAdminData: false,
                }),
            { wrapper },
        );
        const smtp = {
            enabled: true,
            host: 'smtp.example.test',
            port: 587,
            secure: false,
            username: 'synthetic@example.test',
            password: 'SYNTHETIC-TEST-PASSWORD',
            from: 'synthetic@example.test',
        };
        await result.current.mutateAsync({ settings: { featureSystemNotificationEmailsEnabled: true, smtp } });
        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(request.url).toMatch(/tenantadmin\/40$/);
        expect(JSON.parse(request.bodyData)).not.toHaveProperty('licensing');
        expect(JSON.parse(request.bodyData).settings.featureSystemNotificationEmailsEnabled).toBe(true);
        expect(JSON.parse(request.bodyData).settings.smtp).toEqual(smtp);
        expect(client.getQueryData<TenantAdminData>([TENANT_QUERY_KEY, 40])?.licensing).toEqual({
            allowedNumberOfUsers: null,
        });
        expect(seed.licensing).toEqual({ allowedNumberOfUsers: null });
    });

    it('does not prefetch tenant admin data when prefetchTenantAdminData is false', async () => {
        renderHook(
            () =>
                useTenantAdminDataMutation({
                    id: '1',
                    seedTenantAdminData,
                    prefetchTenantAdminData: false,
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(getSingleTenantDataMock).not.toHaveBeenCalled(), { timeout: 100 });
    });

    it('prefetches platform tenant 0 and preserves its existing fields in a partial update', async () => {
        const platform = { ...seedTenantAdminData, id: 0, name: 'Platform', isSuperAdmin: true };
        getSingleTenantDataMock.mockResolvedValue(platform);
        vi.mocked(fetchData).mockResolvedValue(platform);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useTenantAdminDataMutation({ id: 0 }), {
            wrapper,
        });
        await waitFor(() => expect(getSingleTenantDataMock).toHaveBeenCalledWith(0));
        await waitFor(() => expect(client.getQueryData([TENANT_QUERY_KEY, 0])).toEqual(platform));

        await result.current.mutateAsync({ content: { impressum: { de: '<p>Neu</p>' } } });

        const request = vi.mocked(fetchData).mock.calls[0][0];
        const body = JSON.parse(request.bodyData as string);
        expect(request.url).toMatch(/tenantadmin\/0$/);
        expect(body.name).toBe('Platform');
        expect(body.theming).toEqual(platform.theming);
        expect(body.content.impressum).toEqual({ de: '<p>Neu</p>' });
        expect(body.content.privacy).toEqual(platform.content.privacy);
    });
    it('announces a generic success by default', async () => {
        vi.mocked(fetchData).mockResolvedValue(seedTenantAdminData);
        getSingleTenantDataMock.mockResolvedValue(seedTenantAdminData);
        const { result } = renderHook(
            () => useTenantAdminDataMutation({ id: '1', seedTenantAdminData, prefetchTenantAdminData: false }),
            { wrapper: createWrapper() },
        );

        await result.current.mutateAsync({ content: { impressum: { de: '<p>Neu</p>' } } });

        expect(notifySuccess).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'message.success.setting.update' }),
        );
    });

    // #1066: the legal card says "Veröffentlicht" itself; a second, generic toast read as noise.
    it('stays silent on success when the caller brings its own confirmation', async () => {
        vi.mocked(fetchData).mockResolvedValue(seedTenantAdminData);
        getSingleTenantDataMock.mockResolvedValue(seedTenantAdminData);
        const { result } = renderHook(
            () =>
                useTenantAdminDataMutation({
                    id: '1',
                    seedTenantAdminData,
                    prefetchTenantAdminData: false,
                    successMessageKey: null,
                }),
            { wrapper: createWrapper() },
        );

        await result.current.mutateAsync({ content: { impressum: { de: '<p>Neu</p>' } } });

        expect(notifySuccess).not.toHaveBeenCalled();
    });
    // #1066: TenantService replaces every field of a tenant on PUT. The seed from /service/tenant
    // carries neither the Erstantwort texts nor other languages of `claim`, so a PUT built on it
    // wiped them. The body has to rest on a full, fresh /service/tenantadmin read.
    it('keeps the Erstantwort texts and other languages when a legal text is published', async () => {
        const stored: TenantAdminData = {
            ...seedTenantAdminData,
            content: {
                ...seedTenantAdminData.content,
                impressum: { de: '<p>Alt</p>', en: '<p>Old</p>' },
                claim: { de: 'Hilfe', en: 'Help' },
                erstantwortGreeting: { de: '<p>Guten Tag</p>' },
                erstantwortWhoReadsAlong: { de: '<p>Team</p>' },
                erstantwortEmergencyAddition: { de: '<p>Notruf 112</p>' },
                erstantwortFreeNotice: { de: '<p>Kostenfrei</p>' },
                erstantwortClosing: { de: '<p>Grüße</p>' },
                erstantwortResponseDeadlineDays: 2,
            } as TenantAdminData['content'],
        };
        getSingleTenantDataMock.mockResolvedValue(stored);
        vi.mocked(fetchData).mockResolvedValue(stored);
        const { result } = renderHook(
            () => useTenantAdminDataMutation({ id: '1', seedTenantAdminData, prefetchTenantAdminData: false }),
            { wrapper: createWrapper() },
        );

        await result.current.mutateAsync({ content: { impressum: { de: '<p>Neu</p>', en: '<p>New</p>' } } });

        expect(getSingleTenantDataMock).toHaveBeenCalledWith('1', { silent: true });
        const body = JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);
        expect(body.content.impressum).toEqual({ de: '<p>Neu</p>', en: '<p>New</p>' });
        expect(body.content.claim).toEqual({ de: 'Hilfe', en: 'Help' });
        expect(body.content.erstantwortGreeting).toEqual({ de: '<p>Guten Tag</p>' });
        expect(body.content.erstantwortWhoReadsAlong).toEqual({ de: '<p>Team</p>' });
        expect(body.content.erstantwortEmergencyAddition).toEqual({ de: '<p>Notruf 112</p>' });
        expect(body.content.erstantwortFreeNotice).toEqual({ de: '<p>Kostenfrei</p>' });
        expect(body.content.erstantwortClosing).toEqual({ de: '<p>Grüße</p>' });
        expect(body.content.erstantwortResponseDeadlineDays).toBe(2);
    });

    it('merges each overlapping save onto its own fresh read', async () => {
        const firstRead = { ...seedTenantAdminData, name: 'Read for the first save' };
        const secondRead = { ...seedTenantAdminData, name: 'Read for the second save' };
        getSingleTenantDataMock.mockResolvedValueOnce(firstRead).mockResolvedValueOnce(secondRead);
        let finishFirstPut: (value: unknown) => void = () => undefined;
        vi.mocked(fetchData)
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        finishFirstPut = resolve;
                    }),
            )
            .mockImplementationOnce(
                () =>
                    new Promise(() => {
                        // The second PUT never answers: only the first one may write the cache.
                    }),
            );
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(
            () =>
                useTenantAdminDataMutation({
                    id: '1',
                    seedTenantAdminData,
                    prefetchTenantAdminData: false,
                    successMessageKey: null,
                }),
            { wrapper },
        );

        const first = result.current.mutateAsync({ content: { impressum: { de: '<p>Eins</p>' } } });
        result.current.mutate({ content: { privacy: { de: '<p>Zwei</p>' } } });
        await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(2));
        finishFirstPut({});
        await first;

        const cached = client.getQueryData<TenantAdminData>([TENANT_QUERY_KEY, 1]);
        expect(cached?.name).toBe('Read for the first save');
        expect(cached?.content.impressum).toEqual({ de: '<p>Eins</p>' });
    });

    it('writes nothing when the fresh tenant read fails', async () => {
        getSingleTenantDataMock.mockRejectedValue(new Error('CATCH_ALL'));
        const { result } = renderHook(
            () => useTenantAdminDataMutation({ id: '1', seedTenantAdminData, prefetchTenantAdminData: false }),
            { wrapper: createWrapper() },
        );

        await expect(result.current.mutateAsync({ content: { impressum: { de: '<p>Neu</p>' } } })).rejects.toThrow();

        expect(fetchData).not.toHaveBeenCalled();
    });
});
