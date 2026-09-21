/*
 * Shared invite vocabulary (#1026) for the invite bar and the CSV import, so
 * both speak the same contract the backend slices implement.
 */

/** Role the invited person gets ("Rolle"). */
export type InviteRole = 'COUNSELLOR' | 'AGENCY_ADMIN' | 'TENANT_ADMIN';

/**
 * Who is inviting (#1026 visibility rule): the platform admin edits everything,
 * a tenant admin is locked to their own Träger, an agency admin to their own
 * Träger AND Beratungsstelle and may only invite counsellors.
 */
export type InviteViewerScope = 'platform' | 'tenant' | 'agency';

/**
 * "Themen & Fachbereiche" of an invited counsellor (#1026, backend field
 * `topicPermission`): `NONE` = only the preselected department(s) — the default
 * for new invites; `SELECT_EXISTING` = may pick more of the agency's existing
 * departments; `CREATE` = may create new topics (the + button, old behaviour).
 */
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
