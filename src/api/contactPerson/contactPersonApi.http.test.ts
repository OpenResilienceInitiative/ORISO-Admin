// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'admin-token-fixture',
    tryRefreshAccessToken: vi.fn().mockResolvedValue(false),
}));
vi.mock('../auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf-fixture' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'en', normalizeLanguage: (language: string) => language }));
vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login' },
    CSRF_WHITELIST_HEADER: '',
    agencyContactPersonEndpoint: (agencyId: number) =>
        `https://api.example.org/service/useradmin/agencies/${agencyId}/contactperson`,
    tenantContactPersonEndpoint: (tenantId: number) =>
        `https://api.example.org/service/useradmin/tenants/${tenantId}/contactperson`,
    agencyContactCoverageEndpoint: 'https://api.example.org/service/useradmin/agencycontacts/coverage',
}));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'en', language: 'en', t: (key: string) => key } }));

import { postAgencyContactCoverage, putAgencyContactPerson, putTenantContactPerson } from './contactPersonApi';

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const maria = {
    adminId: 'a-1',
    firstName: 'Maria',
    lastName: 'Muster',
    loginEmail: 'maria@example.org',
    displayEmail: 'maria@example.org',
    type: 'AGENCY',
    isConsultant: false,
};

afterEach(() => vi.unstubAllGlobals());

/** ORISO-Admin#1534: the writes and the coverage call must hand back the parsed body, not the Response. */
describe('contact person writes through the actual HTTP transport', () => {
    it('returns the saved centre pair as data', async () => {
        const saved = {
            agencyId: 11,
            tenantId: 7,
            contact: maria,
            traegerDefault: {},
            effectiveSource: 'OWN',
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(saved)));

        await expect(putAgencyContactPerson(11, { contactAdminId: 'a-1' })).resolves.toEqual(saved);
    });

    it('returns the saved Träger default as data', async () => {
        const saved = { tenantId: 7, contact: maria, generalContactEmail: 'info@example.org' };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(saved)));

        await expect(putTenantContactPerson(7, { contactAdminId: 'a-1' })).resolves.toEqual(saved);
    });

    it('returns the coverage list, including an uncovered centre', async () => {
        const coverage = [
            { agencyId: 11, covered: true, source: 'OWN' },
            { agencyId: 12, covered: false, source: 'NONE' },
        ];
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(coverage)));

        await expect(postAgencyContactCoverage([11, 12])).resolves.toEqual(coverage);
    });
});
