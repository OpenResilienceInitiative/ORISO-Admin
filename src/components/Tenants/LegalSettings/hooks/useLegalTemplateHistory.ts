import { useQuery } from '@tanstack/react-query';
import { FETCH_ERRORS } from '../../../../api/fetchData';
import type { TenantLegalDraftKind } from '../../../../api/tenant/legalDrafts';
import { getTenantLegalTemplateHistory, TenantLegalTemplateVersion } from '../../../../api/tenant/legalProposals';
import type { TemplateRecipientLevel } from '../components/SendLegalTemplateDialog';

export type LegalTemplateHistoryState = 'loading' | 'available' | 'unsupported' | 'unavailable';

export const legalTemplateHistoryKey = (level: TemplateRecipientLevel | undefined, kind: TenantLegalDraftKind) =>
    ['legal-template-history', level ?? 'none', kind] as const;

const errorCode = (error: unknown) =>
    error && typeof error === 'object' && 'message' in error ? String((error as Error).message) : '';

/**
 * The template versions already sent for one document, newest first.
 *
 * Only the platform rung has a collection to read (ORISO-TenantService#262 follow-up);
 * the Träger → Beratungsstellen rung reports `unsupported` until AgencyService has one.
 * A server without the collection (404) is `unsupported` as well — "nothing sent yet"
 * would be a false answer to the question the menu section exists for.
 */
export const useLegalTemplateHistory = (level: TemplateRecipientLevel | undefined, kind: TenantLegalDraftKind) => {
    const enabled = level === 'traeger';
    const query = useQuery({
        queryKey: legalTemplateHistoryKey(level, kind),
        queryFn: async () => {
            try {
                const versions = await getTenantLegalTemplateHistory(kind);
                return { state: 'available' as const, versions: Array.isArray(versions) ? versions : [] };
            } catch (error) {
                if (errorCode(error) === FETCH_ERRORS.NO_MATCH) {
                    return { state: 'unsupported' as const, versions: [] as TenantLegalTemplateVersion[] };
                }
                throw error;
            }
        },
        enabled,
        retry: false,
    });

    let state: LegalTemplateHistoryState = 'unsupported';
    if (enabled) {
        if (query.isLoading) state = 'loading';
        else if (query.isError) state = 'unavailable';
        else state = query.data?.state ?? 'available';
    }
    return { versions: query.data?.versions ?? [], state };
};
