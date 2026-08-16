import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn(() => Promise.resolve([])) }));
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL_SILENT: 'CATCH_ALL_SILENT', FORBIDDEN_SILENT: 'FORBIDDEN_SILENT' },
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

describe('legalTextVersionsUrl', () => {
    it('addresses the Träger level on the tenant service', () => {
        expect(legalTextVersionsUrl({ level: 'tenant', tenantId: 7, kind: 'privacy' })).toBe(
            '/service/tenantadmin/7/legal/privacy/versions',
        );
    });

    it('addresses the Beratungsstelle level on the agency service', () => {
        expect(legalTextVersionsUrl({ level: 'agency', agencyId: 12, kind: 'dpp' })).toBe(
            '/service/agencyadmin/agencies/12/dpp/versions',
        );
    });

    it('addresses the Fachbereich level as agency × topic', () => {
        expect(legalTextVersionsUrl({ level: 'department', agencyId: 12, topicId: 3, kind: 'imprint' })).toBe(
            '/service/agencyadmin/agencies/12/topics/3/imprint/versions',
        );
    });
});

describe('getLegalTextVersions', () => {
    it('GETs with auth and silent error handling (a missing history must not toast)', () => {
        getLegalTextVersions({ level: 'department', agencyId: 12, topicId: 3, kind: 'dpp' });
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/12/topics/3/dpp/versions',
                method: 'GET',
                skipAuth: false,
                responseHandling: ['CATCH_ALL_SILENT', 'FORBIDDEN_SILENT'],
            }),
        );
    });
});
