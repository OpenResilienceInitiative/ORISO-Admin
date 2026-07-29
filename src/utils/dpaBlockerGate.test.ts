import { describe, expect, it } from 'vitest';
import { deriveDpaGateDecision, isDpaGateSubject } from './dpaBlockerGate';

describe('isDpaGateSubject', () => {
    it('gates a tenant-scoped tenant admin', () => {
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 21,
            }),
        ).toBe(true);
    });

    it('gates a single-tenant admin with a tenant claim', () => {
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: false,
                hasSingleTenantAdminRole: true,
                isSuperAdmin: false,
                tenantId: 1,
            }),
        ).toBe(true);
    });

    it('never gates the platform super admin', () => {
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: true,
                tenantId: 0,
            }),
        ).toBe(false);
    });

    it('does not gate accounts without a tenant-admin role (agency admins etc.)', () => {
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: false,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 21,
            }),
        ).toBe(false);
    });

    it('does not gate when no positive tenant claim exists', () => {
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: null,
            }),
        ).toBe(false);
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 0,
            }),
        ).toBe(false);
    });
});

describe('deriveDpaGateDecision', () => {
    it('is inactive for non-subjects regardless of status', () => {
        expect(deriveDpaGateDecision({ isSubject: false, status: undefined, isLoading: false, isError: true })).toEqual(
            {
                kind: 'inactive',
            },
        );
    });

    it('is pending while the status is still loading (no route content leaks out)', () => {
        expect(deriveDpaGateDecision({ isSubject: true, status: undefined, isLoading: true, isError: false })).toEqual({
            kind: 'pending',
        });
    });

    it('is inactive once the current DPA version is signed', () => {
        expect(deriveDpaGateDecision({ isSubject: true, status: 'VALID', isLoading: false, isError: false })).toEqual({
            kind: 'inactive',
        });
    });

    it.each(['UNSIGNED', 'OUTDATED'] as const)('blocks signable for %s', (status) => {
        expect(deriveDpaGateDecision({ isSubject: true, status, isLoading: false, isError: false })).toEqual({
            kind: 'blocked',
            reason: status,
            signable: true,
        });
    });

    it('blocks without a sign form when no DPA was ever published', () => {
        expect(deriveDpaGateDecision({ isSubject: true, status: 'MISSING', isLoading: false, isError: false })).toEqual(
            {
                kind: 'blocked',
                reason: 'MISSING',
                signable: false,
            },
        );
    });

    it('blocks with the distinct inconsistent-account state', () => {
        expect(
            deriveDpaGateDecision({ isSubject: true, status: 'INCONSISTENT', isLoading: false, isError: false }),
        ).toEqual({ kind: 'blocked', reason: 'INCONSISTENT', signable: false });
    });

    it('fails closed when the status request errors', () => {
        expect(deriveDpaGateDecision({ isSubject: true, status: undefined, isLoading: false, isError: true })).toEqual({
            kind: 'blocked',
            reason: 'STATUS_UNAVAILABLE',
            signable: false,
        });
    });

    it('fails closed on an unknown status value', () => {
        expect(
            deriveDpaGateDecision({
                isSubject: true,
                status: 'SOMETHING_NEW' as never,
                isLoading: false,
                isError: false,
            }),
        ).toEqual({ kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false });
    });
});
