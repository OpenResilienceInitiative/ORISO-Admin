import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn(() => Promise.resolve([])) }));
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: {
        CATCH_ALL_SILENT: 'CATCH_ALL_SILENT',
        FORBIDDEN_SILENT: 'FORBIDDEN_SILENT',
        NO_MATCH: 'NO_MATCH',
    },
    FETCH_METHODS: { GET: 'GET' },
    fetchData,
}));
vi.mock('../../appConfig', () => ({
    tenantAdminEndpoint: '/service/tenantadmin',
    agencyEndpointBase: '/service/agencyadmin/agencies',
}));

// eslint-disable-next-line import/first
import { getLegalTextVersions, legalTextVersionsUrl } from './getLegalTextVersions';

beforeEach(() => fetchData.mockClear());

/**
 * The URLs are the ones ORISO-AgencyService#256 actually serves: ONE `legal-versions`
 * collection per level, with the document chosen by a `kind` query parameter — not a
 * path segment per document, which is what this client guessed before the contract
 * existed.
 */
describe('legalTextVersionsUrl', () => {
    it('addresses the Beratungsstelle level on the agency service', () => {
        expect(legalTextVersionsUrl({ level: 'agency', agencyId: 12, kind: 'DPP' })).toBe(
            '/service/agencyadmin/agencies/12/legal-versions?kind=DPP',
        );
    });

    it('addresses the Fachbereich level as agency × topic', () => {
        expect(legalTextVersionsUrl({ level: 'department', agencyId: 12, topicId: 3, kind: 'IMPRINT' })).toBe(
            '/service/agencyadmin/agencies/12/topics/3/legal-versions?kind=IMPRINT',
        );
    });

    it('addresses the Träger level on the tenant service', () => {
        expect(legalTextVersionsUrl({ level: 'tenant', tenantId: 7, kind: 'DPP' })).toBe(
            '/service/tenantadmin/7/legal-versions?kind=DPP',
        );
    });
});

describe('getLegalTextVersions', () => {
    const scope = { level: 'department', agencyId: 12, topicId: 3, kind: 'DPP' } as const;

    it('GETs with auth and silent error handling (a missing history must not toast)', () => {
        getLegalTextVersions(scope);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/12/topics/3/legal-versions?kind=DPP',
                method: 'GET',
                skipAuth: false,
                responseHandling: ['NO_MATCH', 'CATCH_ALL_SILENT', 'FORBIDDEN_SILENT'],
            }),
        );
    });

    it('reports a 404 as an empty history — the endpoint has not shipped on this level yet', async () => {
        fetchData.mockRejectedValueOnce(new Error('NO_MATCH'));
        await expect(getLegalTextVersions(scope)).resolves.toEqual([]);
    });

    it.each([
        ['a forbidden history', new Error('NOT_ALLOWED')],
        ['a server error', { status: 500 }],
        ['a network failure', new TypeError('Failed to fetch')],
    ])('rejects on %s rather than claiming nothing was ever published', async (_label, failure) => {
        fetchData.mockRejectedValueOnce(failure);
        await expect(getLegalTextVersions(scope)).rejects.toBeDefined();
    });
});
