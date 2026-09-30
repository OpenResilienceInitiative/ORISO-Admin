import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, fetchData } from '../fetchData';
import { deleteTenantLegalDraft, getTenantLegalDraft, putTenantLegalDraft } from './legalDrafts';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

describe('tenant legal draft API', () => {
    beforeEach(() => vi.mocked(fetchData).mockReset());

    it('uses the exact tenant, kind, revision and consent contract', async () => {
        vi.mocked(fetchData).mockResolvedValue({ revision: '41:0' });
        await putTenantLegalDraft(0, 'PRIVACY', {
            content: { de: '<p>Text</p>' },
            privacyConsent: { de: 'Ich habe {{legal_links}} gelesen.' },
            revision: 'new',
        });

        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/0/legal-drafts/PRIVACY`,
                method: 'PUT',
                bodyData: JSON.stringify({
                    content: { de: '<p>Text</p>' },
                    privacyConsent: { de: 'Ich habe {{legal_links}} gelesen.' },
                    revision: 'new',
                }),
            }),
        );
    });

    it('maps GET 404 to an absent draft and propagates other failures', async () => {
        vi.mocked(fetchData).mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));
        await expect(getTenantLegalDraft(7, 'IMPRINT')).resolves.toBeNull();
        vi.mocked(fetchData).mockRejectedValueOnce(new Error('network'));
        await expect(getTenantLegalDraft(7, 'IMPRINT')).rejects.toThrow('network');
    });

    it('encodes the opaque revision in the required DELETE query parameter', async () => {
        vi.mocked(fetchData).mockResolvedValue(new Response(null, { status: 204 }));
        await expect(deleteTenantLegalDraft(7, 'IMPRINT', '41:0/x')).resolves.toBeUndefined();
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/7/legal-drafts/IMPRINT?revision=41%3A0%2Fx`,
                method: 'DELETE',
            }),
        );
    });
});
