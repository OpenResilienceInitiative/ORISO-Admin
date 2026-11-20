import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchData } from '../api/fetchData';
import { getAccessTokenForRequests } from '../api/auth/auth';
import { baseTenantPublicEndpoint, tenantEndpoint } from '../appConfig';
import { usePublicTenantData } from './usePublicTenantData.hook';
import { useTenantData } from './useTenantData.hook';

const runtime = vi.hoisted(() => ({ mainSlug: 'main' }));

vi.mock('../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../api/fetchData')>()),
    fetchData: vi.fn(),
}));
vi.mock('../api/auth/auth', () => ({ getAccessTokenForRequests: vi.fn() }));
vi.mock('../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: {
            multitenancyWithSingleDomainEnabled: true,
            mainTenantSubdomainForSingleDomainMultitenancy: runtime.mainSlug,
        },
    }),
}));

const PUBLIC_URL = `${baseTenantPublicEndpoint}/main`;
const PRIVATE_URL = `${tenantEndpoint}12`;
const PUBLIC_TENANT = { id: 7, theming: { logo: 'public-logo' } };
const EMPTY_TENANT = { settings: {}, licensing: {} };
const fetchMock = vi.mocked(fetchData);

const mountStartup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(
        () => ({
            publicQuery: usePublicTenantData(),
            privateQuery: useTenantData(),
        }),
        { wrapper },
    );
};

describe('Admin startup tenant reads', () => {
    beforeEach(() => {
        runtime.mainSlug = 'main';
        fetchMock.mockReset();
        const payload = Buffer.from(JSON.stringify({ tenantId: 12 }), 'utf8').toString('base64url');
        vi.mocked(getAccessTokenForRequests).mockReturnValue(`header.${payload}.signature`);
    });

    it('shares the pending public lookup and keeps the signed-in tenant read private', async () => {
        const { promise, resolve } = Promise.withResolvers<typeof PUBLIC_TENANT>();
        fetchMock.mockImplementation(({ skipAuth }) =>
            skipAuth ? promise : Promise.resolve({ id: 12, settings: { activeLanguages: 'de' } }),
        );

        const { result } = mountStartup();
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        resolve(PUBLIC_TENANT);

        await waitFor(() => expect(result.current.privateQuery.data?.id).toBe(12));
        expect(result.current.publicQuery.data).toEqual(PUBLIC_TENANT);
        expect(fetchMock.mock.calls.map(([{ url, skipAuth }]) => ({ url, skipAuth }))).toEqual([
            { url: PUBLIC_URL, skipAuth: true },
            { url: PRIVATE_URL, skipAuth: false },
        ]);
    });

    it('does not make a request if the public slug is unresolved', async () => {
        runtime.mainSlug = '';
        const { result } = mountStartup();

        await waitFor(() => expect(result.current.privateQuery.data).toEqual(EMPTY_TENANT));
        expect(result.current.publicQuery.data).toBeUndefined();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps both neutral results and skips the private endpoint if the public request fails', async () => {
        fetchMock.mockRejectedValue(new Error('Unavailable'));

        const { result } = mountStartup();

        await waitFor(() => expect(result.current.privateQuery.data).toEqual(EMPTY_TENANT));
        expect(result.current.publicQuery.data).toEqual(EMPTY_TENANT);
        expect(fetchMock.mock.calls.map(([{ url, skipAuth }]) => ({ url, skipAuth }))).toEqual([
            { url: PUBLIC_URL, skipAuth: true },
        ]);
    });

    it('keeps the public branding if the authenticated endpoint fails', async () => {
        fetchMock.mockImplementation(({ skipAuth }) =>
            skipAuth ? Promise.resolve(PUBLIC_TENANT) : Promise.reject(new Error('Unavailable')),
        );

        const { result } = mountStartup();

        await waitFor(() => expect(result.current.privateQuery.data).toEqual(EMPTY_TENANT));
        expect(result.current.publicQuery.data).toEqual(PUBLIC_TENANT);
        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: PRIVATE_URL, skipAuth: false }));
    });
});
