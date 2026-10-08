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

    it('reports a 404 from a TenantService older than #1070 as unsupported instead of an empty history', async () => {
        fetchData.mockRejectedValueOnce(new Error('NO_MATCH'));
        await expect(getLegalTextVersions({ level: 'tenant', tenantId: 7, kind: 'DPP' })).resolves.toEqual({
            state: 'unsupported',
        });
    });

    it('reads the TenantService history shape (PLATFORM/TENANT owner, no consentText) as available', async () => {
        const version = {
            id: 42,
            kind: 'DPP',
            ownerLevel: 'TENANT',
            ownerId: 7,
            content: '{"de":"<p>Datenschutz</p>"}',
            publishedAt: '2026-09-25T14:30:00',
        };
        fetchData.mockResolvedValueOnce([version] as never);
        await expect(getLegalTextVersions({ level: 'tenant', tenantId: 7, kind: 'DPP' })).resolves.toEqual({
            state: 'available',
            versions: [version],
        });
        expect(legalTextVersionsUrl({ level: 'tenant', tenantId: 0, kind: 'IMPRINT' })).toBe(
            '/service/tenantadmin/0/legal-versions?kind=IMPRINT',
        );
    });

    it('keeps an agency or department 404 as an error rather than guessing its availability', async () => {
        fetchData.mockRejectedValueOnce(new Error('NO_MATCH'));
        await expect(getLegalTextVersions(scope)).rejects.toBeDefined();
    });

    it('keeps a successful empty collection distinct from an unsupported endpoint', async () => {
        fetchData.mockResolvedValueOnce([]);
        await expect(getLegalTextVersions(scope)).resolves.toEqual({ state: 'available', versions: [] });
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
