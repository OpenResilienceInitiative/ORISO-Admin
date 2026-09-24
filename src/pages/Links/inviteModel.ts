// Shared by the invite bar and the CSV import so both send the same contract.

/** Role the invited person gets ("Rolle"). */
export type InviteRole = 'COUNSELLOR' | 'AGENCY_ADMIN' | 'TENANT_ADMIN';

// Tenant admins are locked to their own Träger; agency admins also to their own
// Beratungsstelle, and they may only invite counsellors.
export type InviteViewerScope = 'platform' | 'tenant' | 'agency';

// `NONE` (default): preselected departments only. `SELECT_EXISTING`: may add the
// agency's existing departments. `CREATE`: may create new topics.
export type TopicPermission = 'NONE' | 'SELECT_EXISTING' | 'CREATE';

export const TOPIC_PERMISSIONS: TopicPermission[] = ['NONE', 'SELECT_EXISTING', 'CREATE'];
export const DEFAULT_TOPIC_PERMISSION: TopicPermission = 'NONE';

export const INVITE_ROLES: InviteRole[] = ['COUNSELLOR', 'AGENCY_ADMIN', 'TENANT_ADMIN'];

/** Roles a viewer may hand out ("a higher unit invites a lower one"). */
export const rolesForViewer = (viewerScope: InviteViewerScope): InviteRole[] =>
    viewerScope === 'agency' ? ['COUNSELLOR'] : INVITE_ROLES;

/** German default labels; call sites translate through `t(key, default)`. */
export const ROLE_LABEL_KEYS: Record<InviteRole, [key: string, fallback: string]> = {
    COUNSELLOR: ['links.composer.role.counsellor', 'Berater:in'],
    AGENCY_ADMIN: ['links.composer.role.agencyAdmin', 'BST-Admin'],
    TENANT_ADMIN: ['links.composer.role.tenantAdmin', 'Träger-Admin'],
};

export const TOPIC_PERMISSION_LABEL_KEYS: Record<
    TopicPermission,
    { title: [key: string, fallback: string]; description: [key: string, fallback: string] }
> = {
    NONE: {
        title: ['links.composer.topics.none', 'Keine weiteren Fachbereiche'],
        description: ['links.composer.topics.noneHint', 'Nur die vorausgewählten Fachbereiche.'],
    },
    SELECT_EXISTING: {
        title: ['links.composer.topics.selectExisting', 'Darf weitere Fachbereiche auswählen'],
        description: [
            'links.composer.topics.selectExistingHint',
            'Wählt selbst aus den vorhandenen Fachbereichen der Beratungsstelle.',
        ],
    },
    CREATE: {
        title: ['links.composer.topics.create', 'Darf weitere Themen anlegen'],
        description: ['links.composer.topics.createHint', 'Darf neue Themen anlegen (Plus-Knopf).'],
    },
};

/**
 * Short labels for the invite table cell (#1026, Frank's decision): the field's
 * own label already says "Themen", so the value is one or two words. The full
 * title and description live in the tooltip and in the open select.
 */
export const TOPIC_PERMISSION_SHORT_LABEL_KEYS: Record<TopicPermission, [key: string, fallback: string]> = {
    NONE: ['links.composer.topics.noneShort', 'Keine weiteren'],
    SELECT_EXISTING: ['links.composer.topics.selectExistingShort', 'Auswählen'],
    CREATE: ['links.composer.topics.createShort', 'Anlegen'],
};

/**
 * "Berät auch" for an agency-admin invite (#1026 slice 3, backend field
 * `alsoCounsellor`, default `true`). The invitee can still change it while
 * onboarding.
 */
export const ALSO_COUNSELLOR_LABEL_KEYS: Record<
    'yes' | 'no',
    { title: [key: string, fallback: string]; description: [key: string, fallback: string] }
> = {
    yes: {
        title: ['links.composer.alsoCounsellor.yes', 'Berät auch'],
        description: [
            'links.composer.alsoCounsellor.yesHint',
            'Verwaltet die Beratungsstelle und berät selbst (Berater:in-Konto).',
        ],
    },
    no: {
        title: ['links.composer.alsoCounsellor.no', 'Nur Verwaltung'],
        description: ['links.composer.alsoCounsellor.noHint', 'Verwaltet die Beratungsstelle, berät nicht selbst.'],
    },
};

/**
 * German explanations for the 409 reasons of the invite and self-assignment
 * endpoints (#1026 slices 3 and 5). Keyed by the backend's `X-Reason` header.
 */
export const INVITE_CONFLICT_REASON_KEYS: Record<string, [key: string, fallback: string]> = {
    NO_PENDING_UNIT_ADMIN: [
        'links.accountInvites.conflict.noPendingUnitAdmin',
        'Diese Beratungsstelle gibt es noch nicht, und für sie ist keine BST-Admin-Einladung offen. Laden Sie zuerst die Person ein, die sie anlegt: Rolle „BST-Admin“ (mit „Berät auch“) und dieselbe Nummer. Berater:innen-Einladungen warten dann und gehen automatisch raus, sobald die Beratungsstelle angelegt ist.',
    ],
    UNIT_NOT_CREATED: [
        'links.accountInvites.conflict.unitNotCreated',
        'Diese Einladung kann noch nicht versendet werden: Die Beratungsstelle bzw. der Träger ist noch nicht angelegt. Sie geht automatisch raus, sobald die Admin-Person ihr Onboarding abgeschlossen hat.',
    ],
    SELF_ASSIGNMENT_ALREADY_EXISTS: [
        'links.selfAssign.conflict.alreadyExists',
        'Sie sind in dieser Beratungsstelle bereits in dieser Rolle eingetragen.',
    ],
    CONSULTANT_IDENTITY_ALREADY_GRANTED: [
        'links.selfAssign.conflict.alreadyExists',
        'Sie sind in dieser Beratungsstelle bereits in dieser Rolle eingetragen.',
    ],
};

/** The explanation for a 409 `X-Reason`, or `undefined` for a reason this module does not know. */
export const inviteConflictReasonKey = (reason: string | null | undefined) =>
    reason ? INVITE_CONFLICT_REASON_KEYS[reason] : undefined;
