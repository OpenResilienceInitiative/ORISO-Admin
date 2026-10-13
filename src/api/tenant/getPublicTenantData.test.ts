import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});
// Default impl matters: runtimeConfig.ts calls getLocationVariables() at module
// load (before beforeEach), so an undefined return would crash the import graph.
vi.mock('../../utils/getLocationVariables', () => ({
    default: vi.fn(() => ({ subdomain: 'tenant1', host: '', protocol: '', origin: '' })),
}));

import getPublicTenantData, { getPublicTenantDataById } from './getPublicTenantData';
import { fetchData, FETCH_METHODS } from '../fetchData';
import getLocationVariables from '../../utils/getLocationVariables';
import { baseTenantPublicEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);
const locMock = vi.mocked(getLocationVariables);

beforeEach(() => {
    fetchMock.mockReset();
    locMock.mockClear();
    fetchMock.mockResolvedValue({ ok: true });
    locMock.mockReturnValue({ subdomain: 'tenant1', host: '', protocol: '', origin: '' });
});

describe('getPublicTenantData', () => {
    it('uses the location subdomain as slug when single-domain multitenancy is off', async () => {
        await getPublicTenantData({ multitenancyWithSingleDomainEnabled: false } as never);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${baseTenantPublicEndpoint}/tenant1`,
                method: FETCH_METHODS.GET,
                skipAuth: true,
            }),
        );
    });

    it('uses the configured main subdomain when single-domain multitenancy is on', async () => {
        await getPublicTenantData({
            multitenancyWithSingleDomainEnabled: true,
            mainTenantSubdomainForSingleDomainMultitenancy: 'main',
        } as never);

        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: `${baseTenantPublicEndpoint}/main` }));
    });

    it('reads effective identity for the edited id independently of the main tenant slug', async () => {
        fetchMock.mockResolvedValue({ id: 1, theming: { assistantName: 'Platform helper' } });
        const result = await getPublicTenantDataById('1');
        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${baseTenantPublicEndpoint}/id/1`,
                method: FETCH_METHODS.GET,
                skipAuth: true,
            }),
        );
        expect(result).toEqual({ id: 1, theming: { assistantName: 'Platform helper' } });
    });

    it('resolves to null without fetching when there is no slug', async () => {
        locMock.mockReturnValue({ subdomain: '', host: '', protocol: '', origin: '' });

        const result = await getPublicTenantData({ multitenancyWithSingleDomainEnabled: false } as never);

        expect(result).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
