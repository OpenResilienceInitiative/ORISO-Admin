import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agencyLegalProposalDistributionsEndpoint, tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, fetchData } from '../fetchData';
import {
    adoptTenantLegalProposal,
    dismissTenantLegalProposal,
    distributeAgencyLegalProposal,
    getAgencyLegalTemplateHistory,
    getTenantLegalDraftArchives,
    getTenantLegalProposals,
    toAgencyLegalKind,
} from './legalProposals';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

/** Shape of `TenantLegalProposalDTO` (ORISO-TenantService `api/tenantservice.yaml`). */
const tenantProposal = {
    id: 31,
    recipientTenantId: 7,
    kind: 'IMPRINT',
    content: { de: '<p>Muster-Impressum</p>' },
    status: 'PENDING',
    revision: '31:0',
    sourceRevision: '9:2',
    sourceUpdatedAt: '2026-09-25T12:00:00',
    distributionId: '7c3e0000-0000-0000-0000-000000000001',
    audience: 'ALL',
    createdBy: 'platform-admin',
    createdAt: '2026-09-25T12:31:07',
};

describe('Träger legal proposal inbox API (TenantService#262/#266)', () => {
    beforeEach(() => vi.mocked(fetchData).mockReset());

    it('lists the Träger inbox for one document, and reads a missing collection as unsupported', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce([tenantProposal]);
        await expect(getTenantLegalProposals(7, 'IMPRINT')).resolves.toEqual([tenantProposal]);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({ url: `${tenantAdminEndpoint}/7/legal-proposals?kind=IMPRINT`, method: 'GET' }),
        );

        vi.mocked(fetchData).mockResolvedValueOnce([]);
        await getTenantLegalProposals(7);
        expect(vi.mocked(fetchData).mock.calls[1][0].url).toBe(`${tenantAdminEndpoint}/7/legal-proposals`);

        // An older TenantService without the inbox answers 404: that is "not there", never "empty".
        vi.mocked(fetchData).mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));
        await expect(getTenantLegalProposals(7, 'IMPRINT')).resolves.toBeNull();
        vi.mocked(fetchData).mockRejectedValueOnce(new Error('network'));
        await expect(getTenantLegalProposals(7, 'IMPRINT')).rejects.toThrow('network');
    });

    it('dismisses with the expected proposal revision', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce({ ...tenantProposal, status: 'DISMISSED' });
        await dismissTenantLegalProposal(7, 31, '31:0');
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/7/legal-proposals/31/dismiss`,
                method: 'POST',
                bodyData: JSON.stringify({ expectedProposalRevision: '31:0' }),
                responseHandling: expect.arrayContaining([FETCH_ERRORS.CONFLICT]),
            }),
        );
    });

    it('adopts into an empty draft, or archives and replaces an existing one', async () => {
        vi.mocked(fetchData).mockResolvedValue({ kind: 'IMPRINT', content: {}, revision: '12:0', updatedAt: '' });
        await adoptTenantLegalProposal(7, 31, { mode: 'CREATE_IF_EMPTY', expectedProposalRevision: '31:0' });
        expect(vi.mocked(fetchData).mock.calls[0][0]).toMatchObject({
            url: `${tenantAdminEndpoint}/7/legal-proposals/31/adopt`,
            method: 'POST',
            bodyData: JSON.stringify({ mode: 'CREATE_IF_EMPTY', expectedProposalRevision: '31:0' }),
        });

        await adoptTenantLegalProposal(7, 31, {
            mode: 'ARCHIVE_AND_REPLACE',
            expectedProposalRevision: '31:0',
            expectedDraftRevision: '12:3',
        });
        expect(JSON.parse(vi.mocked(fetchData).mock.calls[1][0].bodyData as string)).toEqual({
            mode: 'ARCHIVE_AND_REPLACE',
            expectedProposalRevision: '31:0',
            expectedDraftRevision: '12:3',
        });
    });

    it('lists the archived drafts an adoption replaced; a missing collection is an empty list', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce([{ id: 4 }]);
        await expect(getTenantLegalDraftArchives(7, 'PRIVACY')).resolves.toEqual([{ id: 4 }]);
        expect(vi.mocked(fetchData).mock.calls[0][0].url).toBe(
            `${tenantAdminEndpoint}/7/legal-draft-archives?kind=PRIVACY`,
        );
        vi.mocked(fetchData).mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));
        await expect(getTenantLegalDraftArchives(7, 'PRIVACY')).resolves.toEqual([]);
    });
});

describe('Träger → Beratungsstellen forward (AgencyService#303, API note 3.1/3.2)', () => {
    beforeEach(() => vi.mocked(fetchData).mockReset());

    it('forwards the saved draft with the API-note body and keeps 400/403 distinguishable', async () => {
        const response = {
            distributionId: '7c3e',
            requestKey: 'k-1',
            kind: 'DPP',
            source: 'DRAFT',
            sourceRevision: '12:3',
            audience: 'SELECTED',
            recipientAgencyIds: [101, 102],
            createdAt: '2026-09-25T14:31:07',
            proposals: [],
        };
        vi.mocked(fetchData).mockResolvedValueOnce(response);
        await expect(
            distributeAgencyLegalProposal({
                requestKey: 'k-1',
                kind: 'PRIVACY',
                sourceRevision: '12:3',
                audience: 'SELECTED',
                agencyIds: [101, 102],
            }),
        ).resolves.toEqual(response);
        const call = vi.mocked(fetchData).mock.calls[0][0];
        expect(call.url).toBe(agencyLegalProposalDistributionsEndpoint);
        expect(call.method).toBe('POST');
        expect(JSON.parse(call.bodyData as string)).toEqual({
            requestKey: 'k-1',
            kind: 'PRIVACY',
            source: 'DRAFT',
            sourceRevision: '12:3',
            audience: 'SELECTED',
            agencyIds: [101, 102],
        });
        // 400 = no Beratungsstelle / unknown id, 403 = not a Träger admin: both need their own sentence.
        expect(call.responseHandling).toEqual(
            expect.arrayContaining([
                FETCH_ERRORS.BAD_REQUEST,
                FETCH_ERRORS.FORBIDDEN,
                FETCH_ERRORS.CONFLICT,
                FETCH_ERRORS.NO_MATCH,
            ]),
        );
    });

    it('reads the sent history in the AgencyService spelling and maps it onto the template-version shape', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce([
            {
                distributionId: '7c3e',
                kind: 'DPP',
                source: 'DRAFT',
                sourceRevision: '12:3',
                audience: 'SELECTED',
                recipientAgencyIds: [101, 102],
                recipientCount: 2,
                content: { de: '<p>Träger</p>' },
                consentText: { de: 'Ich habe die {{legal_links}} gelesen.' },
                createdBy: 'u',
                createdAt: '2026-09-25T14:31:07',
            },
        ]);
        await expect(getAgencyLegalTemplateHistory('PRIVACY')).resolves.toEqual([
            {
                distributionId: '7c3e',
                sourceRevision: '12:3',
                createdAt: '2026-09-25T14:31:07',
                recipientCount: 2,
                content: { de: '<p>Träger</p>' },
                privacyConsent: { de: 'Ich habe die {{legal_links}} gelesen.' },
            },
        ]);
        expect(vi.mocked(fetchData).mock.calls[0][0].url).toBe(`${agencyLegalProposalDistributionsEndpoint}?kind=DPP`);
    });

    it('translates the TenantService kind into the AgencyService wire enum', () => {
        expect(toAgencyLegalKind('PRIVACY')).toBe('DPP');
        expect(toAgencyLegalKind('IMPRINT')).toBe('IMPRINT');
    });
});
