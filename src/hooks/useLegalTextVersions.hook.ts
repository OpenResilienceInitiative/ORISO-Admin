import { useQuery } from '@tanstack/react-query';
import { getLegalTextVersions } from '../api/legal/getLegalTextVersions';
import { LegalTextVersion, LegalVersionScope } from '../types/legalVersion';

export const LEGAL_TEXT_VERSIONS_KEY = 'legal-text-versions';

/** Stable, serialisable query key for one scope. */
export const legalTextVersionsKey = (scope: LegalVersionScope) => [
    LEGAL_TEXT_VERSIONS_KEY,
    scope.level,
    scope.kind,
    scope.level === 'tenant' ? scope.tenantId : scope.agencyId,
    scope.level === 'department' ? scope.topicId : null,
];

const hasUsableIds = (scope: LegalVersionScope): boolean => {
    if (scope.level === 'tenant') return Number.isFinite(scope.tenantId) && scope.tenantId > 0;
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
 * nothing was ever published. `getLegalTextVersions` already folds a 404 into an
 * empty list, so a level whose endpoint has not shipped yet reports "no versions"
 * instead of an error.
 */
export const useLegalTextVersions = (scope: LegalVersionScope, enabled = true) =>
    useQuery<LegalTextVersion[]>({
        queryKey: legalTextVersionsKey(scope),
        queryFn: () => getLegalTextVersions(scope),
        enabled: enabled && hasUsableIds(scope),
        staleTime: 60_000,
        retry: false,
    });
