import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, fetchData } from '../fetchData';
import {
    adoptAgencyLegalProposal,
    dismissAgencyLegalProposal,
    getAgencyLegalDraftArchives,
    getAgencyLegalProposals,
} from './legalProposals';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

/** Verbatim shape of the API note, section 3.3. */
const proposal = {
    id: 5001,
    recipientAgencyId: 101,
    kind: 'DPP',
    content: { de: '<p>Träger-Fassung</p>' },
    consentText: { de: 'Ich habe die {{legal_links}} gelesen.' },
    status: 'PENDING',
    revision: '5001:0',
    source: 'DRAFT',
    sourceRevision: '12:3',
    distributionId: '7c3e',
    audience: 'SELECTED',
    createdBy: 'keycloak-user-id-of-traeger-admin',
    createdAt: '2026-09-25T14:31:07',
    decidedBy: null,
    decidedAt: null,
    supersededByProposalId: null,
    supersededAt: null,
    departmentImpact: { affected: 3, notAffected: 1, notAffectedTopicIds: [12] },
};

describe('Beratungsstelle legal proposal inbox API (API note 3.3)', () => {
    beforeEach(() => vi.mocked(fetchData).mockReset());

    it('lists the inbox per document and reads a missing endpoint as unsupported', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce([proposal]);
        await expect(getAgencyLegalProposals(101, 'DPP')).resolves.toEqual([proposal]);
        expect(vi.mocked(fetchData).mock.calls[0][0]).toMatchObject({
            url: `${agencyEndpointBase}/101/legal-proposals?kind=DPP`,
            method: 'GET',
        });
        vi.mocked(fetchData).mockResolvedValueOnce([]);
        await getAgencyLegalProposals(101);
        expect(vi.mocked(fetchData).mock.calls[1][0].url).toBe(`${agencyEndpointBase}/101/legal-proposals`);
        vi.mocked(fetchData).mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));
        await expect(getAgencyLegalProposals(101, 'DPP')).resolves.toBeNull();
        vi.mocked(fetchData).mockRejectedValueOnce(new Error('network'));
        await expect(getAgencyLegalProposals(101, 'DPP')).rejects.toThrow('network');
    });

    it('dismisses and adopts with the revision tokens echoed unchanged', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce({ ...proposal, status: 'DISMISSED' });
        await dismissAgencyLegalProposal(101, 5001, '5001:0');
        expect(vi.mocked(fetchData).mock.calls[0][0]).toMatchObject({
            url: `${agencyEndpointBase}/101/legal-proposals/5001/dismiss`,
            method: 'POST',
            bodyData: JSON.stringify({ expectedProposalRevision: '5001:0' }),
        });

        const adoption = {
            draft: {
                kind: 'DPP',
                content: { de: '<p>Träger-Fassung</p>' },
                consentText: {},
                revision: '8c65e53a-1e5d-4e72-80da-13323900448c:4',
                savedAt: '2026-09-25T14:40:00',
                originProposalId: 5001,
            },
            proposal: { ...proposal, status: 'ADOPTED' },
            archivedDraft: { id: 9 },
            departmentImpact: proposal.departmentImpact,
        };
        vi.mocked(fetchData).mockResolvedValueOnce(adoption);
        await expect(
            adoptAgencyLegalProposal(101, 5001, {
                mode: 'ARCHIVE_AND_REPLACE',
                expectedProposalRevision: '5001:0',
                expectedDraftRevision: '8c65e53a-1e5d-4e72-80da-13323900448c:3',
            }),
        ).resolves.toEqual(adoption);
        const call = vi.mocked(fetchData).mock.calls[1][0];
        expect(call.url).toBe(`${agencyEndpointBase}/101/legal-proposals/5001/adopt`);
        expect(JSON.parse(call.bodyData as string)).toEqual({
            mode: 'ARCHIVE_AND_REPLACE',
            expectedProposalRevision: '5001:0',
            expectedDraftRevision: '8c65e53a-1e5d-4e72-80da-13323900448c:3',
        });
        expect(call.responseHandling).toEqual(expect.arrayContaining([FETCH_ERRORS.CONFLICT, 'CONTENT']));
    });

    it('lists archived drafts, empty when the collection is missing', async () => {
        vi.mocked(fetchData).mockResolvedValueOnce([{ id: 9, agencyId: 101 }]);
        await expect(getAgencyLegalDraftArchives(101, 'IMPRINT')).resolves.toEqual([{ id: 9, agencyId: 101 }]);
        expect(vi.mocked(fetchData).mock.calls[0][0].url).toBe(
            `${agencyEndpointBase}/101/legal-draft-archives?kind=IMPRINT`,
        );
        vi.mocked(fetchData).mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));
        await expect(getAgencyLegalDraftArchives(101, 'IMPRINT')).resolves.toEqual([]);
    });
});
