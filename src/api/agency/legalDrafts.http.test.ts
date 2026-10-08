// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'agency-admin-token',
    tryRefreshAccessToken: vi.fn(),
}));
vi.mock('../auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf-token' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'de', normalizeLanguage: (language: string) => language }));
vi.mock('../../appConfig', () => ({
    agencyEndpointBase: 'https://api.example/service/agencyadmin/agencies',
    CSRF_WHITELIST_HEADER: '',
    default: { login: '/admin/login' },
}));
vi.mock('antd', () => ({ message: { error: vi.fn() } }));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'de', language: 'de', t: (key: unknown) => key } }));

// eslint-disable-next-line import/first
import { putAgencyLegalDraft } from './legalDrafts';

describe('agency legal drafts HTTP contract', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        kind: 'DPP',
                        content: { de: '<p>Vom Server bereinigt</p>' },
                        consentText: { de: 'Bereinigte Einwilligung' },
                        revision: 'cf166adc-fb21-4dd1-8934-2b47229793f9:0',
                        savedAt: '2026-09-17T12:00:00',
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                ),
            ),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the parsed PUT response from the real transport seam', async () => {
        const result = await putAgencyLegalDraft(31, 'DPP', {
            content: { de: '<script>bad()</script><p>Entwurf</p>' },
            consentText: { de: 'Einwilligung' },
        });

        expect(result).toEqual({
            kind: 'DPP',
            content: { de: '<p>Vom Server bereinigt</p>' },
            consentText: { de: 'Bereinigte Einwilligung' },
            revision: 'cf166adc-fb21-4dd1-8934-2b47229793f9:0',
            savedAt: '2026-09-17T12:00:00',
        });

        const request = vi.mocked(fetch).mock.calls[0][0] as Request;
        expect(request.url).toBe('https://api.example/service/agencyadmin/agencies/31/legal-drafts/DPP');
        expect(request.method).toBe('PUT');
        expect(request.headers.get('authorization')).toBe('Bearer agency-admin-token');
        await expect(request.json()).resolves.toEqual({
            content: { de: '<script>bad()</script><p>Entwurf</p>' },
            consentText: { de: 'Einwilligung' },
        });
    });
});
