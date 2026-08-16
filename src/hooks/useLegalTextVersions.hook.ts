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
 * A failure resolves to an EMPTY history instead of rejecting. Unlike the AVV
 * card — where the versions ARE the content and a load error must withhold the
 * editor — version look-back is additive on the privacy/imprint/DPP cards: they
 * edited the live text without any history before this feature. Degrading to
 * "nothing to look back at" therefore keeps the card fully usable while the
 * AgencyService endpoints of #250 are still in flight, and it is the same
 * behaviour once a level genuinely has no archived version yet.
 */
export const useLegalTextVersions = (scope: LegalVersionScope, enabled = true) =>
    useQuery<LegalTextVersion[]>({
        queryKey: legalTextVersionsKey(scope),
        queryFn: () => getLegalTextVersions(scope).catch(() => [] as LegalTextVersion[]),
        enabled: enabled && hasUsableIds(scope),
        staleTime: 60_000,
        retry: false,
    });
