import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});
vi.mock('../auth/auth', () => ({ getAccessTokenForRequests: vi.fn() }));

import getTenantData from './getTenantData';
import { fetchData } from '../fetchData';
import { getAccessTokenForRequests } from '../auth/auth';
import { tenantEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);
const tokenMock = vi.mocked(getAccessTokenForRequests);

// browser-faithful atob for parseJwt under jsdom
const browserAtob = (b64: string): string => Buffer.from(b64, 'base64').toString('binary');
const makeToken = (payload: unknown): string =>
    `header.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.sig`;

beforeAll(() => vi.stubGlobal('atob', browserAtob));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
    fetchMock.mockReset();
    tokenMock.mockReset();
    fetchMock.mockResolvedValue({});
});

describe('getTenantData', () => {
    it('uses the tenant id from the form when single-domain multitenancy is off', async () => {
        tokenMock.mockReturnValue(makeToken({ tenantId: 9 }));

        await getTenantData({ id: 3 } as never, false);

        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: `${tenantEndpoint}3` }));
    });

    it('overrides with the token tenantId when single-domain multitenancy is on', async () => {
        tokenMock.mockReturnValue(makeToken({ tenantId: 5 }));

        await getTenantData({ id: 1 } as never, true);

        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: `${tenantEndpoint}5` }));
    });

    it('keeps the form tenant id when the token tenantId is 0 (super-admin)', async () => {
        tokenMock.mockReturnValue(makeToken({ tenantId: 0 }));

        await getTenantData({ id: 2 } as never, true);

        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: `${tenantEndpoint}2` }));
    });

    it('coalesces nullable text fields to empty strings', async () => {
        tokenMock.mockReturnValue('');
        fetchMock.mockResolvedValue({ id: 4, name: 'Caritas', impressum: null, secondaryColor: null });

        const result = await getTenantData({ id: 4 } as never, false);

        expect(result).toMatchObject({
            name: 'Caritas',
            impressum: '',
            privacy: '',
            termsAndConditions: '',
            secondaryColor: '',
            address: '',
            description: '',
        });
    });
});
