import type {
    AccountInviteDTO,
    AccountInviteStatus,
    AccountInviteTargetRole,
} from '../../../api/accountInvites/accountInvites';

/**
 * Pure derivation of the onboarding phase stepper (Links page, invite tracking).
 *
 * The invite API exposes no dedicated "phase" field — the stepper is derived
 * from the DTO's status columns and nothing else. Every mapping decision lives
 * in this file so the components stay dumb and the rules stay unit-tested.
 *
 * DATA REALITY: the backend does not (yet) expose a DPA-confirmation signal or
 * a per-step onboarding trace. Phases the data cannot prove stay `pending`;
 * the component API already carries the full phase list so more beads light up
 * the day the backend exposes them (no UI change needed, only rules here).
 */

export type PhaseState = 'done' | 'current' | 'pending' | 'warning' | 'error';

export type PhaseKey =
    | 'invited'
    | 'registered'
    | 'tenantCreated'
    | 'twoFactorActive'
    | 'dpaForwarded'
    | 'dpaSigned'
    | 'accountCreated'
    | 'completed';

export interface InvitePhase {
    key: PhaseKey;
    state: PhaseState;
}

/**
 * Träger onboarding (#725, owner model): Eingeladen → Registriert → Träger
 * angelegt → 2FA aktiv → [Vertragsunterlagen weitergeleitet, only when a
 * forward happened] → Vertrag unterschrieben → Abgeschlossen. The signature is
 * the FINAL gate: the track may never read complete while it is outstanding.
 */
export const TENANT_PHASE_KEYS: readonly PhaseKey[] = [
    'invited',
    'registered',
    'tenantCreated',
    'twoFactorActive',
    'dpaSigned',
    'completed',
];

/** Berater onboarding: Eingeladen → Konto angelegt → Abgeschlossen (all the API can prove today). */
export const COUNSELLOR_PHASE_KEYS: readonly PhaseKey[] = ['invited', 'accountCreated', 'completed'];

/** German product wording; doubles as the i18n defaultValue for both locales. */
export const PHASE_LABEL_FALLBACKS: Record<PhaseKey, string> = {
    invited: 'Eingeladen',
    registered: 'Registriert',
    tenantCreated: 'Träger angelegt',
    twoFactorActive: '2FA aktiv',
    dpaForwarded: 'Vertragsunterlagen weitergeleitet',
    dpaSigned: 'Vertrag unterschrieben',
    accountCreated: 'Konto angelegt',
    completed: 'Abgeschlossen',
};

/**
 * Wording for the phase that is CURRENT (awaited, not reached). The compact
 * label under the track used to print the reached-state word ("Registriert")
 * for a step that had merely become due — right after the mail went out the
 * row read as if registration had happened. An awaited step says what it is
 * waiting FOR.
 */
export const PHASE_AWAITING_FALLBACKS: Record<PhaseKey, string> = {
    invited: 'Wartet auf Versand',
    registered: 'Wartet auf Registrierung',
    tenantCreated: 'Wartet auf Träger-Anlage',
    twoFactorActive: 'Wartet auf 2FA-Einrichtung',
    dpaForwarded: 'Wartet auf Weiterleitung',
    dpaSigned: 'Wartet auf Vertragsunterschrift',
    accountCreated: 'Wartet auf Kontoanlage',
    completed: 'Wartet auf Abschluss',
};

export const phaseLabelKey = (key: PhaseKey) => `links.inviteProgress.phase.${key}`;
export const phaseAwaitingLabelKey = (key: PhaseKey) => `links.inviteProgress.phaseAwaiting.${key}`;

/** Terminal states in which the invite can never progress again (magenta error treatment). */
const DEAD_STATUSES: ReadonlySet<AccountInviteStatus> = new Set(['EXPIRED', 'REVOKED', 'SUPERSEDED']);

type PhaseFacts = Pick<
    AccountInviteDTO,
    | 'inviteStatus'
    | 'emailDeliveryStatus'
    | 'twoFactorStatus'
    | 'accessGateStatus'
    | 'acceptedAt'
    | 'targetRole'
    | 'dpaForwardedAt'
    | 'dpaSignedAt'
>;

export const isDeadInvite = (invite: Pick<AccountInviteDTO, 'inviteStatus'>): boolean =>
    DEAD_STATUSES.has(invite.inviteStatus);

/** A draft has never been sent — no mail went out, nothing has happened yet. */
export const isDraftInvite = (invite: Pick<AccountInviteDTO, 'inviteStatus'>): boolean =>
    invite.inviteStatus === 'DRAFT';

const hasAccepted = (invite: PhaseFacts) => invite.acceptedAt != null || invite.inviteStatus === 'ACCEPTED';

/**
 * What each phase can be PROVEN with from the DTO. `accessGateStatus === 'READY'`
 * means the invite/e-mail/2FA gates have passed (verified against
 * AccountInviteService.calculateAccessGate) — it says NOTHING about the DPA.
 * Treating READY as DPA proof was the live pre-dev defect that showed a
 * forwarded, unsigned contract as "Abgeschlossen" (#725): the signature is
 * proven ONLY by its own signal, and completion waits for it.
 */
const isPhaseProven = (key: PhaseKey, invite: PhaseFacts): boolean => {
    const ready = invite.accessGateStatus === 'READY';
    switch (key) {
        case 'invited':
            // A bounced e-mail un-proves the send: EMAIL_SENT plus FAILED means
            // nobody was reached — the bead becomes a warning, not a done.
            return (
                hasAccepted(invite) ||
                (invite.emailDeliveryStatus !== 'FAILED' &&
                    (invite.inviteStatus === 'EMAIL_SENT' || invite.emailDeliveryStatus === 'SENT'))
            );
        case 'registered':
        case 'accountCreated':
            return hasAccepted(invite);
        case 'tenantCreated':
            // The accept flow registers the account AND creates the tenant from
            // its reservation in one server-side step; the DTO carries no finer
            // signal, so acceptance is the honest proof for both beads.
            return hasAccepted(invite);
        case 'dpaForwarded':
            return invite.dpaForwardedAt != null;
        case 'dpaSigned':
            // Only the explicit signal proves the signature — NEVER the gate.
            // Until the backend serializes it (see the contract-gap note on the
            // DTO), this bead stays honest by staying open.
            return invite.dpaSignedAt != null;
        case 'twoFactorActive':
            return invite.twoFactorStatus === 'ACTIVE' || invite.twoFactorStatus === 'WAIVED' || ready;
        case 'completed':
            // The signature is the FINAL gate of the tenant track.
            if (invite.targetRole === 'TENANT_ADMIN') {
                return ready && hasAccepted(invite) && invite.dpaSignedAt != null;
            }
            return ready && hasAccepted(invite);
        default:
            return false;
    }
};

export const phaseKeysForRole = (targetRole: AccountInviteTargetRole): readonly PhaseKey[] =>
    targetRole === 'TENANT_ADMIN' ? TENANT_PHASE_KEYS : COUNSELLOR_PHASE_KEYS;

/**
 * The concrete track of ONE invite: the forwarded bead exists only on rows
 * where a forward actually happened (#725 "when applicable") — a self-signing
 * tenant never sees a permanently-idle forward bead.
 */
const phaseKeysForInvite = (invite: PhaseFacts): readonly PhaseKey[] => {
    const keys = phaseKeysForRole(invite.targetRole);
    if (invite.targetRole !== 'TENANT_ADMIN' || invite.dpaForwardedAt == null) {
        return keys;
    }
    return keys.flatMap((key) => (key === 'dpaSigned' ? (['dpaForwarded', 'dpaSigned'] as const) : [key]));
};

/**
 * Map one invite to its stepper phases.
 *
 * - A DRAFT (never sent) renders every phase `pending` — nothing has happened
 *   yet, so no bead may claim completion or activity.
 * - Proven phases are `done`.
 * - On a live invite, the first unproven phase is `current`, later ones `pending`
 *   — except a failed e-mail delivery, which turns the `invited` bead into a
 *   `warning` (a resend repairs it) with no `current` after it.
 * - On a dead invite (EXPIRED / REVOKED / SUPERSEDED) the first unproven phase
 *   is `error` (the magenta error role), later ones `pending`.
 */
export const derivePhases = (invite: PhaseFacts): InvitePhase[] => {
    // A DRAFT is truthfully empty: no mail went out, so neither a done bead nor
    // an active "Eingeladen" would be honest. Every bead stays neutral until the
    // send (owner request on #893). The accepted-guard is defensive only — an
    // accepted DRAFT cannot exist in the data model.
    if (isDraftInvite(invite) && !hasAccepted(invite)) {
        return phaseKeysForInvite(invite).map((key) => ({ key, state: 'pending' as const }));
    }
    const dead = isDeadInvite(invite);
    const deliveryFailed = !dead && invite.emailDeliveryStatus === 'FAILED' && !hasAccepted(invite);
    let blockingSeen = false;

    return phaseKeysForInvite(invite).map((key) => {
        if (isPhaseProven(key, invite)) {
            return { key, state: 'done' as const };
        }
        if (blockingSeen) {
            return { key, state: 'pending' as const };
        }
        blockingSeen = true;
        if (dead) {
            return { key, state: 'error' as const };
        }
        if (deliveryFailed && key === 'invited') {
            return { key, state: 'warning' as const };
        }
        return { key, state: 'current' as const };
    });
};

/** Summary-strip buckets: the four stat tiles above the table. */
export type InviteBucket = 'invited' | 'inProgress' | 'completed' | 'problem';

export const INVITE_BUCKETS: readonly InviteBucket[] = ['invited', 'inProgress', 'completed', 'problem'];

export const deriveInviteBucket = (invite: PhaseFacts): InviteBucket => {
    // A delivery failure only means "problem" while it still blocks the invitee.
    // Once accepted, the bounce is history — the same reading `derivePhases`
    // takes — so a completed onboarding is never filed under "Abgelaufen / Problem".
    if (isDeadInvite(invite) || (invite.emailDeliveryStatus === 'FAILED' && !hasAccepted(invite))) {
        return 'problem';
    }
    // "Abgeschlossen" follows the stepper's final gate: a tenant invite is only
    // complete once the DPA signature landed — READY alone is not completion.
    if (isPhaseProven('completed', invite)) {
        return 'completed';
    }
    if (hasAccepted(invite)) {
        return 'inProgress';
    }
    return 'invited';
};

export const countInviteBuckets = (invites: readonly PhaseFacts[]): Record<InviteBucket, number> => {
    const counts: Record<InviteBucket, number> = { invited: 0, inProgress: 0, completed: 0, problem: 0 };
    invites.forEach((invite) => {
        counts[deriveInviteBucket(invite)] += 1;
    });
    return counts;
};

type IdentityFacts = Pick<AccountInviteDTO, 'firstName' | 'lastName' | 'recipientEmail'>;

/**
 * The name the recipient cell shows — and therefore the only key the "Empfänger"
 * column may sort by. Sorting on `recipientEmail` while the cell renders a
 * person's name makes a correctly sorted column look unsorted.
 */
export const inviteDisplayName = (invite: IdentityFacts): string =>
    [invite.firstName, invite.lastName].filter(Boolean).join(' ') || invite.recipientEmail;

/** Lower-cased, diacritic-stripped form used by the search predicate. */
const fold = (value: string): string =>
    value
        .toLocaleLowerCase('de')
        .normalize('NFD')
        // eslint-disable-next-line no-misleading-character-class -- combining marks are exactly what is stripped
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

type SearchableFacts = Pick<AccountInviteDTO, 'recipientEmail' | 'firstName' | 'lastName' | 'tenantId'>;

/**
 * Toolbar-search predicate for the invite board (A4/#376).
 *
 * Matches the fields the row actually shows: the e-mail, the first and last
 * name, and the Träger-ID the identity cell prints. Case-insensitive and
 * accent-insensitive, so "muller" finds "Müller" — an admin types what is on
 * the keyboard, not what is in the database. All whitespace-separated terms
 * must match, which is what makes "karla fischer" behave like one name rather
 * than an OR over two words.
 *
 * A blank query matches everything: an empty search field is not a filter.
 */
export const matchesInviteQuery = (invite: SearchableFacts, query: string): boolean => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return true;
    const haystack = fold(
        [invite.recipientEmail, invite.firstName, invite.lastName, invite.tenantId?.toString()]
            .filter(Boolean)
            .join(' '),
    );
    return terms.every((term) => haystack.includes(term));
};

type ActivityFacts = Pick<
    AccountInviteDTO,
    'createDate' | 'acceptedAt' | 'revokedAt' | 'supersededAt' | 'twoFactorWaivedAt'
>;

/**
 * Latest known activity timestamp of an invite (ISO string), for the "letzte
 * Aktivität" column. A 2FA waiver counts: it is an admin acting on the invite,
 * and leaving it out made a fresh waiver read as the older acceptance date.
 */
export const inviteLastActivity = (invite: ActivityFacts): string => {
    const candidates = [
        invite.createDate,
        invite.acceptedAt,
        invite.revokedAt,
        invite.supersededAt,
        invite.twoFactorWaivedAt,
    ].filter((value): value is string => value != null);
    // Seeded on purpose: `createDate` is non-nullable today, but an unseeded
    // reduce would throw on an empty list and take the whole board down if the
    // API ever loosens that.
    return candidates.reduce(
        (latest, value) => (new Date(value) > new Date(latest) ? value : latest),
        invite.createDate,
    );
};

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
];

/** "vor 3 Tagen" / "3 days ago" — locale-aware, no library. Sub-minute reads as "now" wording. */
export const formatRelativeTime = (iso: string, locale: string, now: Date = new Date()): string => {
    const elapsed = new Date(iso).getTime() - now.getTime();
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const match = RELATIVE_UNITS.find(({ ms }) => Math.abs(elapsed) >= ms);
    if (!match) {
        return formatter.format(0, 'minute');
    }
    return formatter.format(Math.trunc(elapsed / match.ms), match.unit);
};
