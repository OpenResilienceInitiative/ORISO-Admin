import { useQuery } from '@tanstack/react-query';
import { FETCH_ERRORS } from '../../../../api/fetchData';
import type { TenantLegalDraftKind } from '../../../../api/tenant/legalDrafts';
import {
    getAgencyLegalTemplateHistory,
    getTenantLegalTemplateHistory,
    TenantLegalTemplateVersion,
} from '../../../../api/tenant/legalProposals';
import type { TemplateRecipientLevel } from '../components/SendLegalTemplateDialog';

export type LegalTemplateHistoryState = 'loading' | 'available' | 'unsupported' | 'unavailable';

export const legalTemplateHistoryKey = (level: TemplateRecipientLevel | undefined, kind: TenantLegalDraftKind) =>
    ['legal-template-history', level ?? 'none', kind] as const;

const errorCode = (error: unknown) =>
    error && typeof error === 'object' && 'message' in error ? String((error as Error).message) : '';

/**
 * The template versions already sent for one document, newest first.
 *
 * The platform rung reads TenantService (#262 follow-up), the Träger → Beratungsstellen rung
 * AgencyService (#303, API note 3.2). A server without the collection (404) is `unsupported` — "nothing sent yet"
 * would be a false answer to the question the menu section exists for.
 */
export const useLegalTemplateHistory = (level: TemplateRecipientLevel | undefined, kind: TenantLegalDraftKind) => {
    const enabled = level === 'traeger' || level === 'agencies';
    const query = useQuery({
        queryKey: legalTemplateHistoryKey(level, kind),
        queryFn: async () => {
            try {
                const versions =
                    level === 'agencies'
                        ? await getAgencyLegalTemplateHistory(kind)
                        : await getTenantLegalTemplateHistory(kind);
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
