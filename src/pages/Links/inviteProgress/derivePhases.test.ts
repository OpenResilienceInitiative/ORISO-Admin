import { describe, expect, it } from 'vitest';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import {
    countInviteBuckets,
    deriveInviteBucket,
    derivePhases,
    formatRelativeTime,
    inviteDisplayName,
    inviteLastActivity,
    isDeadInvite,
} from './derivePhases';

const invite = (overrides: Partial<AccountInviteDTO> = {}): AccountInviteDTO => ({
    id: 1,
    targetRole: 'TENANT_ADMIN',
    tenantId: 2,
    recipientEmail: 'maria.huber@example.org',
    firstName: 'Maria',
    lastName: 'Huber',
    agencyId: null,
    departmentId: null,
    provisioningStatus: null,
    inviteStatus: 'EMAIL_SENT',
    emailVerificationStatus: 'PENDING',
    emailDeliveryStatus: 'SENT',
    twoFactorStatus: 'NOT_REQUIRED',
    accessGateStatus: 'BLOCKED_INVITE',
    expiresAt: '2026-08-30T10:00:00Z',
    acceptedAt: null,
    revokedAt: null,
    supersededAt: null,
    twoFactorWaivedBy: null,
    twoFactorWaivedAt: null,
    twoFactorWaiverReason: null,
    createDate: '2026-08-01T10:00:00Z',
    ...overrides,
});

const states = (input: AccountInviteDTO) => derivePhases(input).map((phase) => `${phase.key}:${phase.state}`);

describe('derivePhases — Träger (TENANT_ADMIN)', () => {
    it('marks a freshly sent invite as invited-done, registration current, the rest pending', () => {
        expect(states(invite())).toEqual([
            'invited:done',
            'registered:current',
            'dpaConfirmed:pending',
            'twoFactorActive:pending',
            'completed:pending',
        ]);
    });

    it('keeps a DRAFT on the first bead as current (nothing sent yet)', () => {
        expect(states(invite({ inviteStatus: 'DRAFT', emailDeliveryStatus: null }))).toEqual([
            'invited:current',
            'registered:pending',
            'dpaConfirmed:pending',
            'twoFactorActive:pending',
            'completed:pending',
        ]);
    });

    it('completes registration once accepted; DPA stays pending because the API carries no DPA signal', () => {
        expect(states(invite({ inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z' }))).toEqual([
            'invited:done',
            'registered:done',
            'dpaConfirmed:current',
            'twoFactorActive:pending',
            'completed:pending',
        ]);
    });

    it('lights the 2FA bead from its own signal even while DPA cannot be proven yet', () => {
        expect(
            states(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    twoFactorStatus: 'ACTIVE',
                    accessGateStatus: 'BLOCKED_EMAIL',
                }),
            ),
        ).toEqual([
            'invited:done',
            'registered:done',
            'dpaConfirmed:current',
            'twoFactorActive:done',
            'completed:pending',
        ]);
    });

    it('treats a WAIVED 2FA like an open gate', () => {
        const phases = derivePhases(
            invite({
                inviteStatus: 'ACCEPTED',
                acceptedAt: '2026-08-02T10:00:00Z',
                twoFactorStatus: 'WAIVED',
            }),
        );
        expect(phases.find((phase) => phase.key === 'twoFactorActive')?.state).toBe('done');
    });

    it('completes every bead when the access gate is READY (also proves DPA and a NOT_REQUIRED 2FA)', () => {
        expect(
            states(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    emailVerificationStatus: 'VERIFIED',
                    accessGateStatus: 'READY',
                }),
            ),
        ).toEqual(['invited:done', 'registered:done', 'dpaConfirmed:done', 'twoFactorActive:done', 'completed:done']);
    });

    it('turns the invited bead into a warning when the e-mail bounced (a resend repairs it)', () => {
        expect(states(invite({ emailDeliveryStatus: 'FAILED' }))).toEqual([
            'invited:warning',
            'registered:pending',
            'dpaConfirmed:pending',
            'twoFactorActive:pending',
            'completed:pending',
        ]);
    });

    it('marks the first unproven bead of an EXPIRED invite as error, the rest pending', () => {
        expect(states(invite({ inviteStatus: 'EXPIRED' }))).toEqual([
            'invited:done',
            'registered:error',
            'dpaConfirmed:pending',
            'twoFactorActive:pending',
            'completed:pending',
        ]);
    });

    it('puts the error on the very first bead when a REVOKED invite proved nothing', () => {
        expect(states(invite({ inviteStatus: 'REVOKED', emailDeliveryStatus: null }))).toEqual([
            'invited:error',
            'registered:pending',
            'dpaConfirmed:pending',
            'twoFactorActive:pending',
            'completed:pending',
        ]);
    });
});

describe('derivePhases — Berater (COUNSELLOR)', () => {
    it('uses the three-phase track', () => {
        expect(states(invite({ targetRole: 'COUNSELLOR' }))).toEqual([
            'invited:done',
            'accountCreated:current',
            'completed:pending',
        ]);
    });

    it('completes the track when the gate is READY', () => {
        expect(
            states(
                invite({
                    targetRole: 'COUNSELLOR',
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    accessGateStatus: 'READY',
                }),
            ),
        ).toEqual(['invited:done', 'accountCreated:done', 'completed:done']);
    });

    it('applies the error treatment to superseded invites', () => {
        expect(states(invite({ targetRole: 'COUNSELLOR', inviteStatus: 'SUPERSEDED' }))).toEqual([
            'invited:done',
            'accountCreated:error',
            'completed:pending',
        ]);
    });
});

describe('deriveInviteBucket', () => {
    it('buckets live unaccepted invites as invited', () => {
        expect(deriveInviteBucket(invite())).toBe('invited');
        expect(deriveInviteBucket(invite({ inviteStatus: 'DRAFT', emailDeliveryStatus: null }))).toBe('invited');
    });

    it('buckets accepted-but-not-ready invites as inProgress', () => {
        expect(deriveInviteBucket(invite({ inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z' }))).toBe(
            'inProgress',
        );
    });

    it('buckets READY invites as completed', () => {
        expect(
            deriveInviteBucket(
                invite({ inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z', accessGateStatus: 'READY' }),
            ),
        ).toBe('completed');
    });

    it('buckets dead invites and failed deliveries as problem', () => {
        expect(deriveInviteBucket(invite({ inviteStatus: 'EXPIRED' }))).toBe('problem');
        expect(deriveInviteBucket(invite({ inviteStatus: 'REVOKED' }))).toBe('problem');
        expect(deriveInviteBucket(invite({ inviteStatus: 'SUPERSEDED' }))).toBe('problem');
        expect(deriveInviteBucket(invite({ emailDeliveryStatus: 'FAILED' }))).toBe('problem');
    });

    it('stops calling a bounce a problem once the invite was accepted', () => {
        // A historical FAILED delivery on a finished onboarding must not land the
        // row under "Abgelaufen / Problem" while its stepper shows all-done —
        // the bucket now reads the bounce the same way derivePhases does.
        expect(
            deriveInviteBucket(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    emailDeliveryStatus: 'FAILED',
                    accessGateStatus: 'READY',
                }),
            ),
        ).toBe('completed');
        expect(
            deriveInviteBucket(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    emailDeliveryStatus: 'FAILED',
                }),
            ),
        ).toBe('inProgress');
    });

    it('counts every bucket over a list', () => {
        expect(
            countInviteBuckets([
                invite(),
                invite({ inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z' }),
                invite({ inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z', accessGateStatus: 'READY' }),
                invite({ inviteStatus: 'EXPIRED' }),
                invite({ inviteStatus: 'EXPIRED' }),
            ]),
        ).toEqual({ invited: 1, inProgress: 1, completed: 1, problem: 2 });
    });
});

describe('isDeadInvite', () => {
    it('is true exactly for EXPIRED, REVOKED and SUPERSEDED', () => {
        expect(isDeadInvite(invite({ inviteStatus: 'EXPIRED' }))).toBe(true);
        expect(isDeadInvite(invite({ inviteStatus: 'REVOKED' }))).toBe(true);
        expect(isDeadInvite(invite({ inviteStatus: 'SUPERSEDED' }))).toBe(true);
        expect(isDeadInvite(invite())).toBe(false);
        expect(isDeadInvite(invite({ inviteStatus: 'ACCEPTED' }))).toBe(false);
    });
});

describe('inviteDisplayName', () => {
    it('joins the name parts and falls back to the e-mail', () => {
        expect(inviteDisplayName(invite())).toBe('Maria Huber');
        expect(inviteDisplayName(invite({ lastName: null }))).toBe('Maria');
        expect(inviteDisplayName(invite({ firstName: null }))).toBe('Huber');
        expect(inviteDisplayName(invite({ firstName: null, lastName: null }))).toBe('maria.huber@example.org');
    });
});

describe('inviteLastActivity', () => {
    it('falls back to the create date', () => {
        expect(inviteLastActivity(invite())).toBe('2026-08-01T10:00:00Z');
    });

    it('picks the latest of the lifecycle timestamps', () => {
        expect(
            inviteLastActivity(invite({ acceptedAt: '2026-08-03T10:00:00Z', revokedAt: '2026-08-05T10:00:00Z' })),
        ).toBe('2026-08-05T10:00:00Z');
    });
});

describe('formatRelativeTime', () => {
    const now = new Date('2026-08-12T12:00:00Z');

    it('formats German relative wording', () => {
        expect(formatRelativeTime('2026-08-09T12:00:00Z', 'de', now)).toBe('vor 3 Tagen');
        expect(formatRelativeTime('2026-08-12T09:00:00Z', 'de', now)).toBe('vor 3 Stunden');
    });

    it('formats English relative wording', () => {
        expect(formatRelativeTime('2026-08-05T12:00:00Z', 'en', now)).toBe('last week');
    });

    it('reads sub-minute differences as "now" wording instead of 0 seconds', () => {
        expect(formatRelativeTime('2026-08-12T11:59:59Z', 'de', now)).toBe('in dieser Minute');
    });
});
