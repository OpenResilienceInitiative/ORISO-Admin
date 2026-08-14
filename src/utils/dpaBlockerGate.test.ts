import { describe, expect, it } from 'vitest';
import { deriveDpaGateDecision, isDpaGateSubject, resolveDpaGateSubject } from './dpaBlockerGate';

describe('resolveDpaGateSubject', () => {
    it('gates a tenant-scoped tenant admin', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 21,
            }),
        ).toBe('subject');
    });

    it('gates a single-tenant admin with a tenant claim', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: false,
                hasSingleTenantAdminRole: true,
                isSuperAdmin: false,
                tenantId: 1,
            }),
        ).toBe('subject');
    });

    it('never gates the platform super admin', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: true,
                tenantId: 0,
            }),
        ).toBe('exempt');
    });

    it('does not gate accounts without a tenant-admin role (agency admins etc.)', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: false,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 21,
            }),
        ).toBe('exempt');
    });

    it('treats tenant 0 as platform scope (no signable tenant)', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 0,
            }),
        ).toBe('exempt');
    });

    it('FAILS CLOSED on a tenant admin without a usable tenantId claim (#569 hardening)', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: null,
            }),
        ).toBe('indeterminate');
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: false,
                hasSingleTenantAdminRole: true,
                isSuperAdmin: false,
                tenantId: Number.NaN,
            }),
        ).toBe('indeterminate');
    });

    it('FAILS CLOSED on a malformed/undecodable token', () => {
        expect(
            resolveDpaGateSubject({
                hasTenantAdminRole: false,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: null,
                tokenUnreadable: true,
            }),
        ).toBe('indeterminate');
    });

    it('keeps the boolean wrapper aligned', () => {
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: 21,
            }),
        ).toBe(true);
        expect(
            isDpaGateSubject({
                hasTenantAdminRole: true,
                hasSingleTenantAdminRole: false,
                isSuperAdmin: false,
                tenantId: null,
            }),
        ).toBe(false);
    });
});

describe('deriveDpaGateDecision', () => {
    it('is inactive for exempt accounts regardless of status', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'exempt', status: undefined, isLoading: false, isError: true }),
        ).toEqual({
            kind: 'inactive',
        });
    });

    it('blocks fail-closed for indeterminate accounts (malformed token) without a status fetch', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'indeterminate',
                status: undefined,
                isLoading: false,
                isError: false,
            }),
        ).toEqual({ kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false });
    });

    it('is pending while the status is still loading (no route content leaks out)', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: undefined, isLoading: true, isError: false }),
        ).toEqual({
            kind: 'pending',
        });
    });

    it('is inactive once the current DPA version is signed', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: 'VALID', isLoading: false, isError: false }),
        ).toEqual({
            kind: 'inactive',
        });
    });

    it.each(['UNSIGNED', 'OUTDATED'] as const)('blocks signable for %s', (status) => {
        expect(deriveDpaGateDecision({ subjectKind: 'subject', status, isLoading: false, isError: false })).toEqual({
            kind: 'blocked',
            reason: status,
            signable: true,
        });
    });

    it('blocks without a sign form when no DPA was ever published', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: 'MISSING', isLoading: false, isError: false }),
        ).toEqual({
            kind: 'blocked',
            reason: 'MISSING',
            signable: false,
        });
    });

    it('blocks with the distinct inconsistent-account state', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: 'INCONSISTENT', isLoading: false, isError: false }),
        ).toEqual({ kind: 'blocked', reason: 'INCONSISTENT', signable: false });
    });

    it('fails closed when the status request errors', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: undefined, isLoading: false, isError: true }),
        ).toEqual({
            kind: 'blocked',
            reason: 'STATUS_UNAVAILABLE',
            signable: false,
        });
    });

    it('fails closed on an unknown status value', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'SOMETHING_NEW' as never,
                isLoading: false,
                isError: false,
            }),
        ).toEqual({ kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false });
    });
});

describe('deriveDpaGateDecision — forwarded-pending (#724)', () => {
    const FORWARD = {
        signLink: 'https://app.example.org/dpa-sign/active-token',
        expiresAt: '2099-01-01T00:00:00Z',
        recipientEmail: 'legal@example.org',
    };

    it.each(['UNSIGNED', 'OUTDATED'] as const)(
        'softens the %s block into forwarded-pending when an active forward is proven',
        (status) => {
            expect(
                deriveDpaGateDecision({
                    subjectKind: 'subject',
                    status,
                    isLoading: false,
                    isError: false,
                    forward: FORWARD,
                }),
            ).toEqual({ kind: 'forwarded-pending', reason: status, forward: FORWARD });
        },
    );

    it('stays pending while the forward lookup is in flight (nothing leaks out)', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'UNSIGNED',
                isLoading: false,
                isError: false,
                forwardLoading: true,
            }),
        ).toEqual({ kind: 'pending' });
    });

    it('keeps the hard blocker when no forward was ever declared (#572 unchanged)', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'UNSIGNED',
                isLoading: false,
                isError: false,
                forward: null,
            }),
        ).toEqual({ kind: 'blocked', reason: 'UNSIGNED', signable: true });
    });

    it('keeps the hard blocker when the forward state is unknown (fail-closed)', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'UNSIGNED',
                isLoading: false,
                isError: false,
                forward: undefined,
            }),
        ).toEqual({ kind: 'blocked', reason: 'UNSIGNED', signable: true });
    });

    it('never softens the non-signable states, forward or not', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'MISSING',
                isLoading: false,
                isError: false,
                forward: FORWARD,
            }),
        ).toEqual({ kind: 'blocked', reason: 'MISSING', signable: false });
    });
});
