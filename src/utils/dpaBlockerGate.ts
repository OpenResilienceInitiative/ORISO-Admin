import { TenantDpaStatus } from '../types/dpa';

/**
 * TEN-INV-U10 (#572, parent #569): decision logic for the global,
 * non-bypassable DPA blocker. Pure functions so the route-guard behavior is
 * unit-testable in isolation (mirrors `platformAdminTwoFactorGate.ts`).
 *
 * Frontend enforcement only locks the UI — the backend write-guard is
 * TenantService/UserService scope (TEN-INV-U9/U3): every mutating endpoint
 * stays the authoritative line of defense.
 */

export type DpaBlockerReason = 'UNSIGNED' | 'OUTDATED' | 'MISSING' | 'INCONSISTENT' | 'STATUS_UNAVAILABLE';

export type DpaGateDecision =
    | { kind: 'inactive' }
    | { kind: 'pending' }
    | { kind: 'blocked'; reason: DpaBlockerReason; signable: boolean }
    /**
     * #724: the signature is missing but was explicitly handed to an
     * authorised signatory. The app renders — with the friendly recurring
     * dialog instead of the hard blocker. The backend write-guard for
     * legal-gated operations is untouched.
     */
    | { kind: 'forwarded-pending'; reason: DpaBlockerReason };

export interface DpaGateSubjectInput {
    hasTenantAdminRole: boolean;
    hasSingleTenantAdminRole: boolean;
    isSuperAdmin: boolean;
    tenantId: number | null;
    /** An access token exists but could not be decoded at all (malformed JWT). */
    tokenUnreadable?: boolean;
}

/**
 * Gate scope of the current account:
 *
 * - `subject` — a tenant-scoped admin: acts for the tenant that has to sign
 *   the DPA, so the authoritative status decides.
 * - `exempt` — the platform super admin (tenant 0) publishes DPA versions
 *   and must never be locked out by their own gate; non-tenant-admin roles
 *   (agency admins, topic admins, …) cannot sign for the tenant.
 * - `indeterminate` — the token cannot prove the account is exempt (#569
 *   hardening): a malformed/undecodable token, or a tenant-admin role whose
 *   tenantId claim is missing or unparseable. FAIL-CLOSED: the gate blocks
 *   with the retry state instead of granting full access.
 */
export type DpaGateSubjectKind = 'subject' | 'exempt' | 'indeterminate';

export const resolveDpaGateSubject = ({
    hasTenantAdminRole,
    hasSingleTenantAdminRole,
    isSuperAdmin,
    tenantId,
    tokenUnreadable = false,
}: DpaGateSubjectInput): DpaGateSubjectKind => {
    if (tokenUnreadable) return 'indeterminate';
    if (isSuperAdmin) return 'exempt';
    if (!hasTenantAdminRole && !hasSingleTenantAdminRole) return 'exempt';
    if (tenantId === null || !Number.isFinite(tenantId)) return 'indeterminate';
    // Tenant 0 = platform scope (not a signable tenant).
    return tenantId > 0 ? 'subject' : 'exempt';
};

/** Convenience wrapper kept for callers that only need the boolean. */
export const isDpaGateSubject = (input: DpaGateSubjectInput): boolean => resolveDpaGateSubject(input) === 'subject';

export interface DpaGateDecisionInput {
    subjectKind: DpaGateSubjectKind;
    status: TenantDpaStatus | undefined;
    isLoading: boolean;
    isError: boolean;
    /**
     * `forwardPending` from the status DTO (#723 contract correction): the
     * signature was forwarded and an unexpired link is outstanding. It is an
     * ADDITIVE BOOLEAN — the `status` enum is unchanged and carries no
     * `PENDING_FORWARDED` value. Absent/false (older backend, or no forward)
     * keeps the strict gate: softening needs positive proof of the delegation.
     */
    forwardPending?: boolean;
}

/**
 * Derives what the app shell may render. Fails closed: while the status is
 * unknown nothing but the initialization screen renders, a failed or
 * unrecognized status answer blocks with a retry state instead of letting
 * the admin area through, and an account whose token cannot prove exemption
 * (`indeterminate`) is blocked the same way instead of fail-open.
 */
export const deriveDpaGateDecision = ({
    subjectKind,
    status,
    isLoading,
    isError,
    forwardPending = false,
}: DpaGateDecisionInput): DpaGateDecision => {
    if (subjectKind === 'exempt') return { kind: 'inactive' };
    if (subjectKind === 'indeterminate') {
        return { kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false };
    }
    if (isLoading) return { kind: 'pending' };
    if (isError || status === undefined) {
        return { kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false };
    }

    switch (status) {
        case 'VALID':
            return { kind: 'inactive' };
        case 'UNSIGNED':
        case 'OUTDATED':
            // #724: only a positively reported forward softens the gate; the
            // never-forwarded state keeps the strict #572 blocker. The flag
            // rides on the same status answer, so there is no second request
            // to wait for and nothing can leak out meanwhile.
            if (forwardPending) return { kind: 'forwarded-pending', reason: status };
            return { kind: 'blocked', reason: status, signable: true };
        case 'MISSING':
            return { kind: 'blocked', reason: 'MISSING', signable: false };
        case 'INCONSISTENT':
            return { kind: 'blocked', reason: 'INCONSISTENT', signable: false };
        default:
            return { kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false };
    }
};
