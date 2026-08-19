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
    it.each(['UNSIGNED', 'OUTDATED'] as const)(
        'softens the %s block into forwarded-pending when the status reports forwardPending',
        (status) => {
            expect(
                deriveDpaGateDecision({
                    subjectKind: 'subject',
                    status,
                    isLoading: false,
                    isError: false,
                    forwardPending: true,
                }),
            ).toEqual({ kind: 'forwarded-pending', reason: status });
        },
    );

    it('keeps the hard blocker when no forward is pending (#572 unchanged)', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'UNSIGNED',
                isLoading: false,
                isError: false,
                forwardPending: false,
            }),
        ).toEqual({ kind: 'blocked', reason: 'UNSIGNED', signable: true });
    });

    it('keeps the hard blocker when the flag is absent (older backend, no PENDING_FORWARDED enum)', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: 'UNSIGNED', isLoading: false, isError: false }),
        ).toEqual({ kind: 'blocked', reason: 'UNSIGNED', signable: true });
    });

    it('never softens the non-signable states, flag or not', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'MISSING',
                isLoading: false,
                isError: false,
                forwardPending: true,
            }),
        ).toEqual({ kind: 'blocked', reason: 'MISSING', signable: false });
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'INCONSISTENT',
                isLoading: false,
                isError: false,
                forwardPending: true,
            }),
        ).toEqual({ kind: 'blocked', reason: 'INCONSISTENT', signable: false });
    });

    it('never softens a valid signature', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'VALID',
                isLoading: false,
                isError: false,
                forwardPending: true,
            }),
        ).toEqual({ kind: 'inactive' });
    });

    it('still fails closed on an errored status even with the flag set', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: undefined,
                isLoading: false,
                isError: true,
                forwardPending: true,
            }),
        ).toEqual({ kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false });
    });
});

describe('deriveDpaGateDecision — unlock confirmation (JOB8/JOB9)', () => {
    it('asks for an explicit unlock when the signature lands while the tenant waited on the forwarded dialog', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'VALID',
                isLoading: false,
                isError: false,
                wasAwaitingForwardedSignature: true,
            }),
        ).toEqual({ kind: 'unlock-confirm' });
    });

    it('does not ask for an unlock when the tenant never waited on the dialog', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'VALID',
                isLoading: false,
                isError: false,
                wasAwaitingForwardedSignature: false,
            }),
        ).toEqual({ kind: 'inactive' });
    });

    it('never turns an unsigned status into an unlock prompt, however long the tenant waited', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: 'UNSIGNED',
                isLoading: false,
                isError: false,
                forwardPending: true,
                wasAwaitingForwardedSignature: true,
            }),
        ).toEqual({ kind: 'forwarded-pending', reason: 'UNSIGNED' });
    });

    it('never turns an unreadable status into an unlock prompt', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'subject',
                status: undefined,
                isLoading: false,
                isError: true,
                wasAwaitingForwardedSignature: true,
            }),
        ).toEqual({ kind: 'blocked', reason: 'STATUS_UNAVAILABLE', signable: false });
    });

    it('leaves the exempt platform admin untouched', () => {
        expect(
            deriveDpaGateDecision({
                subjectKind: 'exempt',
                status: 'VALID',
                isLoading: false,
                isError: false,
                wasAwaitingForwardedSignature: true,
            }),
        ).toEqual({ kind: 'inactive' });
    });
});
