import { describe, expect, it } from 'vitest';
import {
    DEFAULT_RECIPIENT_SCOPE_POLICY,
    isRecipientScopeLocked,
    resolveRecipientScopePolicy,
    toRecipientScopeWrite,
    withStoredScopeOnly,
    withoutInternalGroupChat,
} from './recipientScopePolicy';

// Seam 1: the pure rules of the setting (default, graceful reading, who may edit, what is written).
// Contract: ORISO-TenantService#321 — internalGroupChat.recipientScope = {value, mode, inherited}.

describe('resolveRecipientScopePolicy', () => {
    it('falls back to the backend default when the field is absent', () => {
        expect(resolveRecipientScopePolicy(undefined)).toEqual({ value: 'AGENCY', mode: 'SUGGESTED', inherited: true });
        expect(resolveRecipientScopePolicy(null)).toEqual(DEFAULT_RECIPIENT_SCOPE_POLICY);
    });

    it('keeps a stored policy as served', () => {
        expect(resolveRecipientScopePolicy({ value: 'TENANT', mode: 'ENFORCED', inherited: false })).toEqual({
            value: 'TENANT',
            mode: 'ENFORCED',
            inherited: false,
        });
    });

    it('does not trust a value or mode it does not know', () => {
        expect(resolveRecipientScopePolicy({ value: 'GALAXY', mode: 'MAYBE' } as never)).toEqual(
            DEFAULT_RECIPIENT_SCOPE_POLICY,
        );
    });

    it('fills a missing mode with a recommendation', () => {
        expect(resolveRecipientScopePolicy({ value: 'PLATFORM' } as never)).toEqual({
            value: 'PLATFORM',
            mode: 'SUGGESTED',
            inherited: false,
        });
    });
});

describe('isRecipientScopeLocked', () => {
    it('locks a Träger admin when the platform enforces the value', () => {
        expect(isRecipientScopeLocked({ value: 'TENANT', mode: 'ENFORCED', inherited: true }, 'tenant')).toBe(true);
    });

    it('lets a Träger admin change a recommendation, and a value the Träger set itself', () => {
        expect(isRecipientScopeLocked({ value: 'TENANT', mode: 'SUGGESTED', inherited: true }, 'tenant')).toBe(false);
        expect(isRecipientScopeLocked({ value: 'TENANT', mode: 'ENFORCED', inherited: false }, 'tenant')).toBe(false);
    });

    it('never locks the platform admin', () => {
        expect(isRecipientScopeLocked({ value: 'TENANT', mode: 'ENFORCED', inherited: true }, 'platform')).toBe(false);
    });
});

describe('toRecipientScopeWrite', () => {
    it('writes value and mode only, never the read-only inherited marker', () => {
        expect(toRecipientScopeWrite({ value: 'PLATFORM', mode: 'ENFORCED', inherited: true })).toEqual({
            internalGroupChat: { recipientScope: { value: 'PLATFORM', mode: 'ENFORCED' } },
        });
    });
});

describe('withoutInternalGroupChat', () => {
    it('leaves the resolved scope out and keeps everything else', () => {
        const body = {
            tenantId: 7,
            policies: {},
            internalGroupChat: {
                recipientScope: { value: 'TENANT' as const, mode: 'SUGGESTED' as const, inherited: true },
            },
        };
        expect(withoutInternalGroupChat(body)).toEqual({ tenantId: 7, policies: {} });
        expect(body.internalGroupChat).toBeDefined();
    });
});

describe('withStoredScopeOnly', () => {
    it('keeps a stored scope, without the read-only marker', () => {
        expect(
            withStoredScopeOnly({
                permissionsPageEnabled: true,
                internalGroupChat: { recipientScope: { value: 'PLATFORM', mode: 'ENFORCED', inherited: false } },
            }),
        ).toEqual({
            permissionsPageEnabled: true,
            internalGroupChat: { recipientScope: { value: 'PLATFORM', mode: 'ENFORCED' } },
        });
    });

    it('drops the untouched default, so it is not stored by accident', () => {
        expect(
            withStoredScopeOnly({
                permissionsPageEnabled: true,
                internalGroupChat: { recipientScope: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true } },
            }),
        ).toEqual({ permissionsPageEnabled: true });
    });

    it('does nothing when the backend sent no scope', () => {
        expect(withStoredScopeOnly({ permissionsPageEnabled: true })).toEqual({ permissionsPageEnabled: true });
    });
});
