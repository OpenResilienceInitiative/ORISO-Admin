import { tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

export type TenantLegalDraftKind = 'PRIVACY' | 'IMPRINT';

export interface TenantLegalDraft {
    kind: TenantLegalDraftKind;
    content: Record<string, string>;
    privacyConsent?: Record<string, string>;
    revision: string;
    updatedAt: string;
}

export interface SaveTenantLegalDraft {
    content: Record<string, string>;
    privacyConsent?: Record<string, string>;
    revision: string;
}

const draftUrl = (tenantId: string | number, kind: TenantLegalDraftKind) =>
    `${tenantAdminEndpoint}/${tenantId}/legal-drafts/${kind}`;

const isError = (error: unknown, code: string) =>
    !!error && typeof error === 'object' && 'message' in error && error.message === code;
const isMissing = (error: unknown) => isError(error, 'NO_MATCH');

export const getTenantLegalDraft = async (
    tenantId: string | number,
    kind: TenantLegalDraftKind,
): Promise<TenantLegalDraft | null> => {
    try {
        return (await fetchData({
            url: draftUrl(tenantId, kind),
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
        })) as TenantLegalDraft;
    } catch (error) {
        if (isMissing(error)) return null;
        throw error;
    }
};

export const putTenantLegalDraft = (
    tenantId: string | number,
    kind: TenantLegalDraftKind,
    draft: SaveTenantLegalDraft,
) =>
    fetchData({
        url: draftUrl(tenantId, kind),
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(draft),
        responseHandling: [
            FETCH_ERRORS.CONFLICT,
            FETCH_ERRORS.NO_MATCH,
            FETCH_ERRORS.CATCH_ALL_SILENT,
            FETCH_SUCCESS.CONTENT,
        ],
    }) as Promise<TenantLegalDraft>;

export const deleteTenantLegalDraft = async (
    tenantId: string | number,
    kind: TenantLegalDraftKind,
    revision: string,
): Promise<void> => {
    try {
        await fetchData({
            url: `${draftUrl(tenantId, kind)}?revision=${encodeURIComponent(revision)}`,
            method: FETCH_METHODS.DELETE,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CONFLICT, FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
    } catch (error) {
        // Cleanup after publication is idempotent: an absent draft is already clean.
        if (isMissing(error)) return;
        throw error;
    }
};

export const isTenantLegalDraftConflict = (error: unknown) => isError(error, FETCH_ERRORS.CONFLICT);
