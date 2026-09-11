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

describe('getTenantData — branding assets survive the authenticated seam', () => {
    /*
     * `getPublicTenantData` decodes `theming.logo` / `favicon` /
     * `associationLogo`; this module never did. That asymmetry made the tenant
     * favicon override dead code: `<TenantFavicon tenantFavicon={data?.theming
     * ?.favicon} />` is fed from HERE, TenantService stores `+` as `&#43;` and
     * `=` as `&#61;`, and `getSafeFaviconUrl`'s HTML_ENTITY guard rejects any
     * data URL still carrying them — so the tenant value was silently discarded
     * and the platform default always won.
     *
     * Live evidence for the encoding is in `decodeTenantAsset.test.ts`: one real
     * stored logo carried 3,284 x `&#43;`, the favicon 249 x `&#43;` plus `&#61;`.
     */
    const encodedIco = 'data:image/vnd.microsoft.icon;base64,AAABAAEAICA&#43;&#43;xEAA&#61;';
    const decodedIco = 'data:image/vnd.microsoft.icon;base64,AAABAAEAICA++xEAA=';

    it('decodes every branding asset, exactly like the public seam', async () => {
        fetchMock.mockResolvedValue({
            theming: { favicon: encodedIco, logo: 'a&#43;b', associationLogo: 'c&#61;d' },
        });

        const result = await getTenantData({ id: 1 } as never, false);

        expect(result.theming.favicon).toBe(decodedIco);
        expect(result.theming.logo).toBe('a+b');
        expect(result.theming.associationLogo).toBe('c=d');
    });

    it('leaves a response without theming untouched', async () => {
        fetchMock.mockResolvedValue({ impressum: null });

        const result = await getTenantData({ id: 1 } as never, false);

        expect(result.theming).toBeUndefined();
        expect(result.impressum).toBe('');
    });

    it('does not invent branding keys that the response never carried', async () => {
        fetchMock.mockResolvedValue({ theming: { favicon: encodedIco } });

        const result = await getTenantData({ id: 1 } as never, false);

        expect(Object.keys(result.theming)).toEqual(['favicon']);
    });
});
