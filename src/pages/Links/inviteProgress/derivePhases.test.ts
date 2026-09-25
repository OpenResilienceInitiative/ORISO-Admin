import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import {
    countLifecyclePhases,
    derivePhases,
    formatRelativeTime,
    formatStepTime,
    inviteDisplayName,
    inviteLastActivity,
    isDeadInvite,
    lifecycleOf,
    matchesInviteQuery,
    phaseReachedAt,
    tileCountsFromServer,
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
    /*
     * Owner model (#725 / live defect on pre-dev): sending the mail proves ONLY
     * "Eingeladen" — never registration. "Vertrag unterschrieben" is the FINAL
     * gate before completion, and the gate status READY (accepted + e-mail +
     * 2FA) says NOTHING about the DPA — a forwarded, unsigned contract must
     * never render as complete.
     */
    it('proves only the invitation after the mail went out — registration is NOT reached', () => {
        expect(states(invite())).toEqual([
            'invited:done',
            'registered:current',
            'tenantCreated:pending',
            'twoFactorActive:pending',
            'dpaSigned:pending',
            'completed:pending',
        ]);
    });

    it('renders a DRAFT all-neutral: no done, no current — nothing has happened yet', () => {
        // Owner request on #893: an active "Eingeladen" bead on a never-sent
        // draft is simply untrue; every bead stays pending until the send.
        expect(states(invite({ inviteStatus: 'DRAFT', emailDeliveryStatus: null }))).toEqual([
            'invited:pending',
            'registered:pending',
            'tenantCreated:pending',
            'twoFactorActive:pending',
            'dpaSigned:pending',
            'completed:pending',
        ]);
    });

    it('acceptance proves registration AND the created Träger; 2FA becomes the current step', () => {
        // The accept flow registers the account and creates the tenant from its
        // reservation in one server-side step — the DTO carries no finer signal,
        // so both beads light together on acceptance.
        expect(states(invite({ inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z' }))).toEqual([
            'invited:done',
            'registered:done',
            'tenantCreated:done',
            'twoFactorActive:current',
            'dpaSigned:pending',
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

    it('READY does NOT prove the signature: the stepper must never show complete while the DPA is outstanding', () => {
        // This is the live pre-dev defect: gate READY = accepted + e-mail + 2FA
        // (verified in AccountInviteService.calculateAccessGate) — the DPA is
        // not part of the gate, so READY may complete every bead EXCEPT the
        // signature and the final completion.
        expect(
            states(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    emailVerificationStatus: 'VERIFIED',
                    accessGateStatus: 'READY',
                }),
            ),
        ).toEqual([
            'invited:done',
            'registered:done',
            'tenantCreated:done',
            'twoFactorActive:done',
            'dpaSigned:current',
            'completed:pending',
        ]);
    });

    it('a forwarded, unsigned DPA shows the forwarded bead as done and waits on the signature — NOT complete', () => {
        expect(
            states(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    accessGateStatus: 'READY',
                    dpaForwardedAt: '2026-08-03T10:00:00Z',
                }),
            ),
        ).toEqual([
            'invited:done',
            'registered:done',
            'tenantCreated:done',
            'twoFactorActive:done',
            'dpaForwarded:done',
            'dpaSigned:current',
            'completed:pending',
        ]);
    });

    it('the landed signature is the final gate: only then is the track complete', () => {
        expect(
            states(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    accessGateStatus: 'READY',
                    dpaForwardedAt: '2026-08-03T10:00:00Z',
                    dpaSignedAt: '2026-08-04T10:00:00Z',
                }),
            ),
        ).toEqual([
            'invited:done',
            'registered:done',
            'tenantCreated:done',
            'twoFactorActive:done',
            'dpaForwarded:done',
            'dpaSigned:done',
            'completed:done',
        ]);
    });

    it('a self-signed tenant (no forward) completes without the forwarded bead', () => {
        expect(
            states(
                invite({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-08-02T10:00:00Z',
                    accessGateStatus: 'READY',
                    dpaSignedAt: '2026-08-04T10:00:00Z',
                }),
            ),
        ).toEqual([
            'invited:done',
            'registered:done',
            'tenantCreated:done',
            'twoFactorActive:done',
            'dpaSigned:done',
            'completed:done',
        ]);
    });

    it('turns the invited bead into a warning when the e-mail bounced (a resend repairs it)', () => {
        expect(states(invite({ emailDeliveryStatus: 'FAILED' }))).toEqual([
            'invited:warning',
            'registered:pending',
            'tenantCreated:pending',
            'twoFactorActive:pending',
            'dpaSigned:pending',
            'completed:pending',
        ]);
    });

    it('marks the first unproven bead of an EXPIRED invite as error, the rest pending', () => {
        expect(states(invite({ inviteStatus: 'EXPIRED' }))).toEqual([
            'invited:done',
            'registered:error',
            'tenantCreated:pending',
            'twoFactorActive:pending',
            'dpaSigned:pending',
            'completed:pending',
        ]);
    });

    it('puts the error on the very first bead when a REVOKED invite proved nothing', () => {
        expect(states(invite({ inviteStatus: 'REVOKED', emailDeliveryStatus: null }))).toEqual([
            'invited:error',
            'registered:pending',
            'tenantCreated:pending',
            'twoFactorActive:pending',
            'dpaSigned:pending',
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

    it('renders a DRAFT all-neutral on the three-phase track too', () => {
        expect(states(invite({ targetRole: 'COUNSELLOR', inviteStatus: 'DRAFT', emailDeliveryStatus: null }))).toEqual([
            'invited:pending',
            'accountCreated:pending',
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

describe('lifecycleOf (the five tiles, phase from the server)', () => {
    const read = (overrides: Partial<AccountInviteDTO>) => lifecycleOf(invite(overrides));

    it.each([
        ['PREPARED', 'prepared'],
        ['INVITED', 'invited'],
        ['ACCOUNT_CREATED', 'accountCreated'],
        ['DONE', 'done'],
        ['NEEDS_ACTION', 'needsAction'],
    ] as const)('files the server phase %s under the %s tile', (progressPhase, phase) => {
        expect(read({ progressPhase })?.phase).toBe(phase);
    });

    it('files revoked and replaced invites (server CLOSED) under "Braucht Aktion", as Frank decided', () => {
        expect(read({ progressPhase: 'CLOSED', inviteStatus: 'REVOKED' })).toEqual({
            phase: 'needsAction',
            detail: 'REVOKED',
        });
        expect(read({ progressPhase: 'CLOSED', inviteStatus: 'SUPERSEDED' })?.detail).toBe('SUPERSEDED');
    });

    it('never guesses a phase the server did not send', () => {
        expect(read({ progressPhase: undefined })).toBeUndefined();
        expect(read({ progressPhase: null })).toBeUndefined();
    });

    it('names why an invite needs action when its raw status alone would not say it', () => {
        expect(read({ progressPhase: 'NEEDS_ACTION', emailDeliveryStatus: 'FAILED' })?.detail).toBe('DELIVERY_FAILED');
        expect(read({ progressPhase: 'NEEDS_ACTION' })?.detail).toBe('LINK_EXPIRED');
        expect(
            read({ progressPhase: 'NEEDS_ACTION', inviteStatus: 'WAITING_FOR_UNIT', queueProblem: 'NO_UNIT_ADMIN' })
                ?.detail,
        ).toBe('NO_UNIT_ADMIN');
        expect(read({ progressPhase: 'NEEDS_ACTION', inviteStatus: 'ACCEPTED' })?.detail).toBe('PROVISIONING_FAILED');
        expect(read({ progressPhase: 'NEEDS_ACTION', inviteStatus: 'EXPIRED' })?.detail).toBe('EXPIRED');
    });

    it('keeps the raw status as the detail everywhere else', () => {
        expect(read({ progressPhase: 'PREPARED', inviteStatus: 'WAITING_FOR_UNIT' })?.detail).toBe('WAITING_FOR_UNIT');
        expect(read({ progressPhase: 'DONE', inviteStatus: 'ACCEPTED' })?.detail).toBe('ACCEPTED');
    });

    it('counts each tile with its breakdown, and leaves rows without a phase out', () => {
        expect(
            countLifecyclePhases([
                invite({ progressPhase: 'PREPARED', inviteStatus: 'DRAFT' }),
                invite({ progressPhase: 'PREPARED', inviteStatus: 'DRAFT' }),
                invite({ progressPhase: 'PREPARED', inviteStatus: 'WAITING_FOR_UNIT' }),
                invite({ progressPhase: 'INVITED' }),
                invite({ progressPhase: 'ACCOUNT_CREATED', inviteStatus: 'ACCEPTED' }),
                invite({ progressPhase: 'NEEDS_ACTION', inviteStatus: 'EXPIRED' }),
                invite({ progressPhase: 'CLOSED', inviteStatus: 'REVOKED' }),
                invite({ progressPhase: 'NEEDS_ACTION', emailDeliveryStatus: 'FAILED' }),
                invite({ progressPhase: undefined }),
            ]),
        ).toEqual({
            prepared: { total: 3, details: { DRAFT: 2, WAITING_FOR_UNIT: 1 } },
            invited: { total: 1, details: { EMAIL_SENT: 1 } },
            accountCreated: { total: 1, details: { ACCEPTED: 1 } },
            done: { total: 0, details: {} },
            needsAction: { total: 3, details: { EXPIRED: 1, REVOKED: 1, DELIVERY_FAILED: 1 } },
        });
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

    it('counts a 2FA waiver as activity', () => {
        // The waiver is an admin acting on the invite; ignoring it made the
        // column report the older acceptance date instead.
        expect(
            inviteLastActivity(
                invite({ acceptedAt: '2026-08-03T10:00:00Z', twoFactorWaivedAt: '2026-08-06T10:00:00Z' }),
            ),
        ).toBe('2026-08-06T10:00:00Z');
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

describe('matchesInviteQuery (A4)', () => {
    it('matches on e-mail, first name, last name and the Träger-ID', () => {
        const row = invite({ tenantId: 42 });
        expect(matchesInviteQuery(row, 'huber@example')).toBe(true);
        expect(matchesInviteQuery(row, 'maria')).toBe(true);
        expect(matchesInviteQuery(row, 'Huber')).toBe(true);
        expect(matchesInviteQuery(row, '42')).toBe(true);
        expect(matchesInviteQuery(row, 'fisch')).toBe(false);
    });

    it('is case- and diacritic-insensitive and requires every term to match', () => {
        const row = invite({ firstName: 'Jürgen', lastName: 'Müller', recipientEmail: 'j.mueller@example.org' });
        expect(matchesInviteQuery(row, 'JÜRGEN')).toBe(true);
        expect(matchesInviteQuery(row, 'muller')).toBe(true);
        expect(matchesInviteQuery(row, 'jurgen muller')).toBe(true);
        expect(matchesInviteQuery(row, 'jurgen fischer')).toBe(false);
    });

    it('treats a blank query as no filter at all', () => {
        expect(matchesInviteQuery(invite(), '   ')).toBe(true);
        expect(matchesInviteQuery(invite(), '')).toBe(true);
    });
});

describe('derivePhases — waiting for a new unit', () => {
    const waiting = (overrides: Partial<AccountInviteDTO> = {}) =>
        invite({
            targetRole: 'COUNSELLOR',
            inviteStatus: 'WAITING_FOR_UNIT',
            waitingForUnit: 'AGENCY',
            emailDeliveryStatus: null,
            expiresAt: null,
            ...overrides,
        });

    it('puts "Beratungsstelle noch nicht angelegt" in front as the current step', () => {
        expect(states(waiting())).toEqual([
            'agencyUnitCreated:current',
            'invited:pending',
            'accountCreated:pending',
            'completed:pending',
        ]);
    });

    it('waits for the Träger when the unit is a new Träger', () => {
        expect(states(waiting({ targetRole: 'AGENCY_ADMIN', waitingForUnit: 'TENANT' }))[0]).toBe(
            'tenantUnitCreated:current',
        );
    });

    it('turns the first step into a warning while no unit admin is pending', () => {
        expect(states(waiting({ queueProblem: 'NO_UNIT_ADMIN' }))[0]).toBe('agencyUnitCreated:warning');
    });

    it('never adds the unit step to an invite that never waited', () => {
        expect(states(invite({ targetRole: 'COUNSELLOR', waitingForUnit: null }))[0]).toBe('invited:done');
    });

    // Frank, 25 Sept: 4 steps when the invite waited for a new unit, otherwise 3.
    it('keeps the unit step, done, once the unit exists and the invite went out', () => {
        expect(
            states(invite({ targetRole: 'COUNSELLOR', waitingForUnit: null, unitCreatedAt: '2026-09-24T09:00:00Z' })),
        ).toEqual(['agencyUnitCreated:done', 'invited:done', 'accountCreated:current', 'completed:pending']);
    });

    it("names a released agency admin's unit step after the new Träger it waited for", () => {
        expect(
            states(
                invite({
                    targetRole: 'AGENCY_ADMIN',
                    tenantIdAllocationMode: 'AUTO',
                    waitingForUnit: null,
                    unitCreatedAt: '2026-09-24T09:00:00Z',
                }),
            )[0],
        ).toBe('tenantUnitCreated:done');
    });
});

describe('phaseReachedAt (the date under each step)', () => {
    const dated = invite({
        targetRole: 'COUNSELLOR',
        unitCreatedAt: '2026-09-24T09:00:00Z',
        sentAt: '2026-09-24T09:01:00Z',
        accountCreatedAt: '2026-09-25T12:30:12Z',
        completedAt: null,
        dpaSignedAt: '2026-09-26T10:00:00Z',
        dpaForwardedAt: '2026-09-25T10:00:00Z',
        twoFactorDoneAt: '2026-09-25T12:40:00Z',
    });

    it.each([
        ['agencyUnitCreated', '2026-09-24T09:00:00Z'],
        ['tenantUnitCreated', '2026-09-24T09:00:00Z'],
        ['invited', '2026-09-24T09:01:00Z'],
        ['accountCreated', '2026-09-25T12:30:12Z'],
        ['registered', '2026-09-25T12:30:12Z'],
        ['dpaForwarded', '2026-09-25T10:00:00Z'],
        ['dpaSigned', '2026-09-26T10:00:00Z'],
        ['completed', null],
        ['tenantCreated', '2026-09-24T09:00:00Z'],
        ['twoFactorActive', '2026-09-25T12:40:00Z'],
    ] as const)('dates %s with %s', (key, expected) => {
        expect(phaseReachedAt(key, dated)).toBe(expected);
    });
});

describe('formatStepTime', () => {
    const originalTz = process.env.TZ;
    beforeAll(() => {
        process.env.TZ = 'Europe/Berlin';
    });
    afterAll(() => {
        process.env.TZ = originalTz;
    });

    it('shows day, month and time under the step, the full timestamp in the tooltip', () => {
        expect(formatStepTime('2026-09-25T12:30:12Z', 'de')).toEqual({
            short: '25.09., 14:30',
            full: '25.09.2026, 14:30:12',
        });
    });

    it('reads a zoneless backend timestamp as UTC', () => {
        expect(formatStepTime('2026-09-25T12:30:12', 'de').short).toBe('25.09., 14:30');
    });
});

// Timestamps arrive as UTC (see withUtcInstants); these run in Europe/Berlin so an offset would show.
describe('timestamps with a zone', () => {
    const originalTz = process.env.TZ;
    beforeAll(() => {
        process.env.TZ = 'Europe/Berlin';
    });
    afterAll(() => {
        process.env.TZ = originalTz;
    });
    const now = new Date('2026-09-21T17:42:02Z');

    it('keeps honouring an explicit zone or offset', () => {
        expect(formatRelativeTime('2026-09-21T17:26:02Z', 'de', now)).toBe('vor 16 Minuten');
        expect(formatRelativeTime('2026-09-21T19:26:02+02:00', 'de', now)).toBe('vor 16 Minuten');
    });

    it('orders timestamps by the instant they denote', () => {
        // 17:30 UTC is later than 19:20+02:00 = 17:20 UTC.
        expect(
            inviteLastActivity(invite({ createDate: '2026-09-21T19:20:00+02:00', revokedAt: '2026-09-21T17:30:00Z' })),
        ).toBe('2026-09-21T17:30:00Z');
    });
});

describe('derivePhases — the Träger tab dates its own steps', () => {
    const founding = (overrides: Partial<AccountInviteDTO> = {}) =>
        invite({ targetRole: 'TENANT_ADMIN', tenantIdAllocationMode: 'MANUAL', ...overrides });

    it('keeps its own steps when the invite created the Träger itself', () => {
        expect(
            states(
                founding({
                    inviteStatus: 'ACCEPTED',
                    acceptedAt: '2026-09-25T12:30:00Z',
                    accountCreatedAt: '2026-09-25T12:30:00Z',
                    unitCreatedAt: '2026-09-25T12:30:00Z',
                }),
            ),
        ).toEqual([
            'invited:done',
            'registered:done',
            'tenantCreated:done',
            'twoFactorActive:current',
            'dpaSigned:pending',
            'completed:pending',
        ]);
    });

    it('puts "Träger angelegt" first after the invite when a co-founder created the Träger', () => {
        expect(states(founding({ unitCreatedAt: '2026-09-24T09:00:00Z' }))).toEqual([
            'invited:done',
            'tenantCreated:done',
            'registered:current',
            'twoFactorActive:pending',
            'dpaSigned:pending',
            'completed:pending',
        ]);
    });
});

describe('tileCountsFromServer (the tiles count every page of the tab)', () => {
    it('reads the totals and the breakdown, with revoked and replaced under "Braucht Aktion"', () => {
        expect(
            tileCountsFromServer(
                { PREPARED: 24, INVITED: 0, ACCOUNT_CREATED: 0, DONE: 3, NEEDS_ACTION: 1, CLOSED: 2 },
                {
                    PREPARED: { DRAFT: 23, WAITING_FOR_UNIT: 1 },
                    DONE: { ACCEPTED: 3 },
                    NEEDS_ACTION: { EXPIRED: 1 },
                    CLOSED: { REVOKED: 1, SUPERSEDED: 1 },
                },
            ),
        ).toEqual({
            prepared: { total: 24, details: { DRAFT: 23, WAITING_FOR_UNIT: 1 } },
            invited: { total: 0, details: {} },
            accountCreated: { total: 0, details: {} },
            done: { total: 3, details: { ACCEPTED: 3 } },
            needsAction: { total: 3, details: { EXPIRED: 1, REVOKED: 1, SUPERSEDED: 1 } },
        });
    });

    it('gives nothing while the server sends no counts', () => {
        expect(tileCountsFromServer(undefined, undefined)).toBeUndefined();
    });
});
