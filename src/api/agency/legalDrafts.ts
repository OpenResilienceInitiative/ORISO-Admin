import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

export type AgencyLegalDraftKind = 'DPP' | 'IMPRINT';

export interface AgencyLegalDraft {
    kind: AgencyLegalDraftKind;
    content: Record<string, string>;
    consentText: Record<string, string>;
    revision: string;
    savedAt: string;
}

export interface SaveAgencyLegalDraft {
    content: Record<string, string>;
    consentText?: Record<string, string>;
    revision?: string;
}

const legalDraftUrl = (agencyId: number, kind: AgencyLegalDraftKind) =>
    `${agencyEndpointBase}/${agencyId}/legal-drafts/${kind}`;

const hasErrorCode = (error: unknown, errorCode: string) => error instanceof Error && error.message === errorCode;

export const isAgencyLegalDraftConflict = (error: unknown) => hasErrorCode(error, FETCH_ERRORS.CONFLICT);

export const getAgencyLegalDraft = async (
    agencyId: number,
    kind: AgencyLegalDraftKind,
): Promise<AgencyLegalDraft | null> => {
    try {
        return (await fetchData({
            url: legalDraftUrl(agencyId, kind),
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
        })) as AgencyLegalDraft;
    } catch (error) {
        if (hasErrorCode(error, FETCH_ERRORS.NO_MATCH)) {
            return null;
        }
        throw error;
    }
};

export const putAgencyLegalDraft = (agencyId: number, kind: AgencyLegalDraftKind, draft: SaveAgencyLegalDraft) =>
    fetchData({
        url: legalDraftUrl(agencyId, kind),
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(draft),
        responseHandling: [
            FETCH_ERRORS.CONFLICT,
            FETCH_ERRORS.NO_MATCH,
            FETCH_ERRORS.CATCH_ALL_SILENT,
            FETCH_SUCCESS.CONTENT,
        ],
    }) as Promise<AgencyLegalDraft>;

export const deleteAgencyLegalDraft = async (
    agencyId: number,
    kind: AgencyLegalDraftKind,
    revision: string,
): Promise<void> => {
    await fetchData({
        url: `${legalDraftUrl(agencyId, kind)}?revision=${encodeURIComponent(revision)}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CONFLICT, FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
    });
};
