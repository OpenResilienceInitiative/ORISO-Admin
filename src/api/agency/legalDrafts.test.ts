import {
    deleteAgencyLegalDraft,
    getAgencyLegalDraft,
    isAgencyLegalDraftConflict,
    putAgencyLegalDraft,
} from './legalDrafts';

const { fetchData } = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: {
        CATCH_ALL_SILENT: 'CATCH_ALL_SILENT',
        CONFLICT: 'CONFLICT',
        NO_MATCH: 'NO_MATCH',
    },
    FETCH_METHODS: {
        DELETE: 'DELETE',
        GET: 'GET',
        PUT: 'PUT',
    },
    FETCH_SUCCESS: {
        CONTENT: 'CONTENT',
    },
    fetchData,
}));

vi.mock('../../appConfig', () => ({
    agencyEndpointBase: '/service/agencyadmin/agencies',
}));

describe('agency legal drafts API', () => {
    beforeEach(() => {
        fetchData.mockReset();
    });

    it('gets and returns a parsed DPP draft', async () => {
        const draft = {
            kind: 'DPP' as const,
            content: { de: '<p>Datenschutz</p>' },
            consentText: { de: 'Ich stimme zu.' },
            revision: 'c9f7fd12-2c2b-42b2-b10d-7c8cdd8c1aae:3',
            savedAt: '2026-09-17T11:22:33',
        };
        fetchData.mockResolvedValue(draft);

        await expect(getAgencyLegalDraft(42, 'DPP')).resolves.toEqual(draft);
        expect(fetchData).toHaveBeenCalledWith({
            url: '/service/agencyadmin/agencies/42/legal-drafts/DPP',
            method: 'GET',
            skipAuth: false,
            responseHandling: ['NO_MATCH', 'CATCH_ALL_SILENT'],
        });
    });

    it('maps a missing GET draft to null while preserving other errors', async () => {
        fetchData.mockRejectedValueOnce(new Error('NO_MATCH'));
        await expect(getAgencyLegalDraft(42, 'IMPRINT')).resolves.toBeNull();

        const forbidden = new Error('FORBIDDEN');
        fetchData.mockRejectedValueOnce(forbidden);
        await expect(getAgencyLegalDraft(42, 'IMPRINT')).rejects.toBe(forbidden);
    });

    it('creates a DPP draft without a revision and parses the response content', async () => {
        const savedDraft = {
            kind: 'DPP' as const,
            content: { de: '<p>Entwurf</p>' },
            consentText: { de: 'Einwilligung' },
            revision: '2d8f3c08-1d43-4ad3-b621-f704455a89a8:0',
            savedAt: '2026-09-17T11:30:00',
        };
        fetchData.mockResolvedValue(savedDraft);

        await expect(
            putAgencyLegalDraft(7, 'DPP', {
                content: savedDraft.content,
                consentText: savedDraft.consentText,
            }),
        ).resolves.toEqual(savedDraft);

        expect(fetchData).toHaveBeenCalledWith({
            url: '/service/agencyadmin/agencies/7/legal-drafts/DPP',
            method: 'PUT',
            skipAuth: false,
            bodyData: JSON.stringify({
                content: savedDraft.content,
                consentText: savedDraft.consentText,
            }),
            responseHandling: ['CONFLICT', 'NO_MATCH', 'CATCH_ALL_SILENT', 'CONTENT'],
        });

        const request = fetchData.mock.calls[0][0];
        expect(JSON.parse(request.bodyData)).not.toHaveProperty('revision');
    });

    it('updates an IMPRINT draft with the opaque revision unchanged', async () => {
        const revision = '5f6dde74-72d1-4faf-b2b2-e6c28cf47a8f:4';
        fetchData.mockResolvedValue({
            kind: 'IMPRINT',
            content: { en: '<p>Imprint</p>' },
            consentText: {},
            revision,
            savedAt: '2026-09-17T11:40:00',
        });

        await putAgencyLegalDraft(9, 'IMPRINT', {
            content: { en: '<p>Imprint</p>' },
            revision,
        });

        expect(JSON.parse(fetchData.mock.calls[0][0].bodyData)).toEqual({
            content: { en: '<p>Imprint</p>' },
            revision,
        });
    });

    it('recognizes PUT conflicts without classifying other failures as conflicts', async () => {
        const conflict = new Error('CONFLICT');
        fetchData.mockRejectedValue(conflict);

        await expect(
            putAgencyLegalDraft(7, 'DPP', {
                content: { de: '<p>Entwurf</p>' },
                revision: 'opaque:1',
            }),
        ).rejects.toBe(conflict);
        expect(isAgencyLegalDraftConflict(conflict)).toBe(true);
        expect(isAgencyLegalDraftConflict(new Error('NO_MATCH'))).toBe(false);
        expect(isAgencyLegalDraftConflict('CONFLICT')).toBe(false);
    });

    it('deletes with an encoded opaque revision', async () => {
        fetchData.mockResolvedValue(new Response(null, { status: 204 }));

        await expect(deleteAgencyLegalDraft(12, 'DPP', 'row/id:4 + next?')).resolves.toBeUndefined();

        expect(fetchData).toHaveBeenCalledWith({
            url: '/service/agencyadmin/agencies/12/legal-drafts/DPP?revision=row%2Fid%3A4%20%2B%20next%3F',
            method: 'DELETE',
            skipAuth: false,
            responseHandling: ['CONFLICT', 'NO_MATCH', 'CATCH_ALL_SILENT'],
        });
    });

    it.each(['NO_MATCH', 'CONFLICT'])('does not swallow DELETE %s failures', async (errorCode) => {
        const error = new Error(errorCode);
        fetchData.mockRejectedValue(error);

        await expect(deleteAgencyLegalDraft(12, 'IMPRINT', 'opaque:2')).rejects.toBe(error);
    });
});
