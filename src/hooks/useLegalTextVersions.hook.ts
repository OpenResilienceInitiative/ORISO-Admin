import { useQuery } from '@tanstack/react-query';
import { getLegalTextVersions, LegalTextVersionsResult } from '../api/legal/getLegalTextVersions';
import { LegalVersionScope } from '../types/legalVersion';

export const LEGAL_TEXT_VERSIONS_KEY = 'legal-text-versions';
export type LegalTextVersionsState = 'loading' | 'available' | 'unsupported' | 'unavailable';

const getHistoryState = (
    queryEnabled: boolean,
    query: { isPending: boolean; isError: boolean; data?: LegalTextVersionsResult },
): LegalTextVersionsState => {
    if (!queryEnabled) return 'available';
    if (query.isPending) return 'loading';
    if (query.isError) return 'unavailable';
    return query.data?.state === 'unsupported' ? 'unsupported' : 'available';
};

/** Stable, serialisable query key for one scope. */
export const legalTextVersionsKey = (scope: LegalVersionScope) => [
    LEGAL_TEXT_VERSIONS_KEY,
    scope.level,
    scope.kind,
    scope.level === 'tenant' ? scope.tenantId : scope.agencyId,
    scope.level === 'department' ? scope.topicId : null,
];

const hasUsableIds = (scope: LegalVersionScope): boolean => {
    // Tenant 0 is the platform's own history (#1070).
    if (scope.level === 'tenant') return Number.isFinite(scope.tenantId) && scope.tenantId >= 0;
    if (scope.level === 'agency') return Number.isFinite(scope.agencyId) && scope.agencyId > 0;
    return Number.isFinite(scope.agencyId) && scope.agencyId > 0 && Number.isFinite(scope.topicId) && scope.topicId > 0;
};

/**
 * Published versions of one legal text, newest first (ADR-021 decision 3).
 *
 * A failure REJECTS and surfaces as `isError`. Unlike the AVV card — where the
 * versions ARE the content and a load error must withhold the editor — version
 * look-back is additive here, so the card stays fully editable; but the caller
 * has to say "history unavailable" rather than show an empty menu that claims
 * nothing was ever published. The public hook API remains an array for card consumers;
 * `historyState` carries the distinction between a successful empty collection, the
 * unimplemented tenant endpoint, a loading query and an actual failure.
 */
export const useLegalTextVersions = (scope: LegalVersionScope, enabled = true) => {
    const queryEnabled = enabled && hasUsableIds(scope);
    const query = useQuery<LegalTextVersionsResult>({
        queryKey: legalTextVersionsKey(scope),
        queryFn: () => getLegalTextVersions(scope),
        enabled: queryEnabled,
        staleTime: 60_000,
        retry: false,
    });
    const historyState = getHistoryState(queryEnabled, query);

    return {
        ...query,
        data: query.data?.state === 'available' ? query.data.versions : [],
        historyState,
    };
};
