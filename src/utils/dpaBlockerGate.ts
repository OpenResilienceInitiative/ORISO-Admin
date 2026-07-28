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
    | { kind: 'blocked'; reason: DpaBlockerReason; signable: boolean };

export interface DpaGateSubjectInput {
    hasTenantAdminRole: boolean;
    hasSingleTenantAdminRole: boolean;
    isSuperAdmin: boolean;
    tenantId: number | null;
}

/**
 * Only tenant-scoped admins are gated: they act for the tenant that has to
 * sign the DPA. The platform super admin (tenant 0) publishes DPA versions
 * and must never be locked out by their own gate; non-tenant-admin roles
 * (agency admins, topic admins, …) cannot sign for the tenant.
 */
export const isDpaGateSubject = ({
    hasTenantAdminRole,
    hasSingleTenantAdminRole,
    isSuperAdmin,
    tenantId,
}: DpaGateSubjectInput): boolean => {
    if (isSuperAdmin) return false;
    if (!hasTenantAdminRole && !hasSingleTenantAdminRole) return false;
    return tenantId !== null && Number.isFinite(tenantId) && tenantId > 0;
};

export interface DpaGateDecisionInput {
    isSubject: boolean;
    status: TenantDpaStatus | undefined;
    isLoading: boolean;
    isError: boolean;
}

/**
 * Derives what the app shell may render. Fails closed: while the status is
 * unknown nothing but the initialization screen renders, and a failed or
 * unrecognized status answer blocks with a retry state instead of letting
 * the admin area through.
 */
export const deriveDpaGateDecision = ({
    isSubject,
    status,
    isLoading,
    isError,
}: DpaGateDecisionInput): DpaGateDecision => {
    if (!isSubject) return { kind: 'inactive' };
    if (isLoading) return { kind: 'pending' };
    if (isError || status === undefined) {
        return { kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false };
    }

    switch (status) {
        case 'VALID':
            return { kind: 'inactive' };
        case 'UNSIGNED':
        case 'OUTDATED':
            return { kind: 'blocked', reason: status, signable: true };
        case 'MISSING':
            return { kind: 'blocked', reason: 'MISSING', signable: false };
        case 'INCONSISTENT':
            return { kind: 'blocked', reason: 'INCONSISTENT', signable: false };
        default:
            return { kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false };
    }
};
