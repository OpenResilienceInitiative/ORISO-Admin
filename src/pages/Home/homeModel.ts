import routePathNames from '../../appConfig';
import type { HasRoleFn } from '../../constants/caseHandoverAccess';
import type { SettingsTab } from '../../constants/settingsTabs';
import { UserRole } from '../../enums/UserRole';
import type { NavGlyphName } from '../../components/NavGlyph';
import type { AdminSidebarNavItem } from '../../components/Layout/AdminSidebar';
import type { AdminNavSubsection } from '../../components/Layout/adminNavTree';

/**
 * The model behind Home (ORISO-Admin#1323, spec: docs/home-dashboard-spec.md).
 *
 * Pure on purpose: tiles come from the nav items the layout already resolved
 * with the permission helpers, so Home can never offer an area the navigation
 * hides. Checklist steps are derived from data the services already store
 * (counts, AVV status, Träger master data, SMTP mode); nothing is stored for Home.
 */

export type HomeRole = 'platform' | 'tenant' | 'agency' | 'other';

export const resolveHomeRole = ({
    isSuperAdmin,
    isTenantScopedAdmin,
    hasRole,
}: {
    isSuperAdmin: boolean;
    isTenantScopedAdmin: boolean;
    hasRole: HasRoleFn;
}): HomeRole => {
    if (isSuperAdmin) return 'platform';
    if (isTenantScopedAdmin || hasRole(UserRole.SingleTenantAdmin)) return 'tenant';
    if (hasRole([UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin])) return 'agency';
    return 'other';
};

/** Counts Home reads; `undefined` = not loaded or not allowed. */
/** What Home knows about the admin's own Träger (or the platform's own tenant). */
export interface OwnTenantFacts {
    /** Name, claim and logo are set. */
    appearanceComplete: boolean;
    /** Name and claim are set (edited under Stammdaten, not Erscheinungsbild). */
    masterDataComplete?: boolean;
    smtpMode?: 'PLATFORM' | 'OWN' | null;
    /** Host, sender and password stored; undefined when the API does not expose the SMTP block. */
    smtpComplete?: boolean;
}

export type DpaStatusFact = 'MISSING' | 'UNSIGNED' | 'OUTDATED' | 'VALID' | 'INCONSISTENT';

export interface HomeFacts {
    ownTenant?: OwnTenantFacts;
    /** AVV status of the admin's Träger (tenant admins only). */
    dpaStatus?: DpaStatusFact;
    /** Every own Beratungsstelle has a postcode and, where listed, at least one topic. */
    agencyComplete?: boolean;
    tenants?: number;
    agencies?: number;
    consultants?: number;
    acceptedTenantInvites?: number;
    acceptedCounsellorInvites?: number;
    openInvites?: number;
    needsActionInvites?: number;
}

export type HomeTileId = 'organisation' | 'invite' | 'accounts' | 'settings' | 'statistics' | 'logs';

/**
 * Home reads in three questions (ORISO-Admin#1374): whom do I bring onto the
 * platform, what do I configure, what do I keep an eye on.
 */
export type HomeSectionId = 'people' | 'configure' | 'observe';

export const HOME_SECTIONS: HomeSectionId[] = ['people', 'configure', 'observe'];

/** A count Home already loads; shown at the end of the row it belongs to. */
export type HomeCountFact = 'tenants' | 'agencies' | 'consultants';

/** A shortcut inside a tile; always one of the admin's own nav destinations. */
export interface HomeTileLink {
    id: string;
    to: string;
    labelKey: string;
    fallbackKey?: string;
    /** `add` = creates or invites something new, `open` = goes to something that exists. */
    kind: 'add' | 'open';
    glyph?: NavGlyphName;
    /** One line under the label: what the destination holds. */
    descriptionKey?: string;
    /** Secondary text joined from several keys, e.g. which admin lists one row covers. */
    detailKeys?: string[];
    count?: HomeCountFact;
    /** Starts a new group inside the tile (a thin rule above it). */
    separated?: boolean;
}

export interface HomeTile {
    id: HomeTileId;
    section: HomeSectionId;
    to: string;
    glyph: NavGlyphName;
    titleKey: string;
    textKey: string;
    links: HomeTileLink[];
}

/** Nav keys per tile; the first key the admin has decides the link. Order = order on Home. */
const TILE_SOURCES: Array<{ id: HomeTileId; section: HomeSectionId; keys: string[]; glyph: NavGlyphName }> = [
    { id: 'invite', section: 'people', keys: ['links'], glyph: 'links' },
    { id: 'organisation', section: 'people', keys: ['tenants', 'agency'], glyph: 'tenants' },
    { id: 'accounts', section: 'people', keys: ['counselors', 'tenants', 'agency'], glyph: 'users' },
    { id: 'settings', section: 'configure', keys: ['theme'], glyph: 'displaySettings' },
    { id: 'statistics', section: 'observe', keys: ['statistics'], glyph: 'statistics' },
    { id: 'logs', section: 'observe', keys: ['logs'], glyph: 'logs' },
];

/** Explanations that differ per level; the rest share one text. */
const ROLE_SPECIFIC: ReadonlySet<HomeTileId> = new Set(['organisation', 'invite', 'accounts']);

export interface HomeTileContext {
    role: HomeRole;
    navItems: AdminSidebarNavItem[];
    /** Subsections per nav key, from `buildAdminNavTree` — already permission-filtered. */
    tree?: Record<string, AdminNavSubsection[]>;
    /** May this admin found a Beratungsstelle (`Create Agency`)? */
    canCreateAgency?: boolean;
    /** May this admin hand out the role BST-Admin on the Berater tab (`invitableRoles`)? */
    canInviteAgencyAdmins?: boolean;
}

const subsectionLinks = (subsections: AdminNavSubsection[] | undefined, kind: HomeTileLink['kind']) =>
    (subsections ?? []).map<HomeTileLink>((sub) => ({
        id: sub.id,
        to: sub.to,
        labelKey: sub.labelKey,
        fallbackKey: sub.fallbackKey,
        kind,
    }));

const linksFor = (
    id: HomeTileId,
    { role, navItems, tree = {}, canCreateAgency = false, canInviteAgencyAdmins = false }: HomeTileContext,
): HomeTileLink[] => {
    const has = (key: string) => navItems.some((nav) => nav.key === key);

    switch (id) {
        case 'invite':
            // "Träger-Invites" founds a whole Träger for the platform admin, invites
            // further admins of the own Träger for everybody else.
            // A Beratungsstellen admin sees "Träger-Invites" read-only (the composer
            // refuses agency viewers, useInviteDraft), so it is no shortcut to invite.
            // BST-Admins are invited on the Berater tab, by whoever may hand out that role.
            return (tree.links ?? []).flatMap<HomeTileLink>((sub) => {
                if (sub.id === 'links:tenants') {
                    if (role === 'agency' || role === 'other') return [];
                    return [
                        {
                            id: sub.id,
                            to: sub.to,
                            labelKey: `home.link.invite.tenants.${role === 'platform' ? 'platform' : 'other'}`,
                            fallbackKey: sub.labelKey,
                            kind: 'add',
                        },
                    ];
                }
                const counsellors: HomeTileLink = {
                    id: sub.id,
                    to: sub.to,
                    labelKey: 'home.link.invite.counsellor',
                    fallbackKey: sub.labelKey,
                    kind: 'add',
                };
                return sub.id === 'links:counsellor' && canInviteAgencyAdmins
                    ? [
                          {
                              id: 'invite-agency-admin',
                              to: sub.to,
                              labelKey: 'home.link.invite.agencyAdmin',
                              kind: 'add',
                          },
                          counsellors,
                      ]
                    : [counsellors];
            });
        case 'organisation': {
            const links: HomeTileLink[] = [];
            if (role === 'platform' && has('links') && (tree.links ?? []).some((sub) => sub.id === 'links:tenants')) {
                links.push({
                    id: 'found-tenant',
                    to: routePathNames.linksTenants,
                    labelKey: 'home.link.foundTenant',
                    kind: 'add',
                });
            }
            if (has('agency') && canCreateAgency) {
                links.push({
                    id: 'found-agency',
                    to: routePathNames.agencyAdd,
                    labelKey: 'home.link.foundAgency',
                    kind: 'add',
                });
            }
            return links;
        }
        case 'accounts': {
            const links: HomeTileLink[] = [];
            const tenants = navItems.find((nav) => nav.key === 'tenants');
            const agency = navItems.find((nav) => nav.key === 'agency');
            if (tenants)
                links.push({
                    id: 'edit-tenants',
                    to: tenants.to,
                    labelKey: 'home.link.tenants',
                    kind: 'open',
                    glyph: 'tenants',
                    count: 'tenants',
                });
            if (agency)
                links.push({
                    id: 'edit-agencies',
                    to: agency.to,
                    labelKey: 'home.link.agencies',
                    kind: 'open',
                    glyph: 'counseling',
                    count: 'agencies',
                });
            // People below the organisations: the admin lists share one row, the
            // types they cover as secondary text; each type is a list this admin may open.
            const users = tree.counselors ?? [];
            const isCounsellorList = (sub: AdminNavSubsection) => sub.id === 'users:counsellors';
            const admins = users.filter((sub) => !isCounsellorList(sub));
            const counsellors = users.find(isCounsellorList);
            const firstPerson = links.length;
            if (admins.length > 0)
                links.push({
                    id: 'edit-admins',
                    to: admins[0].to,
                    labelKey: 'home.link.admins',
                    kind: 'open',
                    glyph: 'profile',
                    detailKeys: admins.map((sub) => `home.link.admins.${sub.id.replace('users:', '')}`),
                });
            if (counsellors)
                links.push({
                    id: 'edit-counsellors',
                    to: counsellors.to,
                    labelKey: 'home.link.counsellors',
                    fallbackKey: counsellors.labelKey,
                    kind: 'open',
                    glyph: 'users',
                    count: 'consultants',
                });
            return links.map((link, index) =>
                index === firstPerson && index > 0 ? { ...link, separated: true } : link,
            );
        }
        case 'logs':
            return subsectionLinks(tree.logs, 'open').map((link) => ({
                ...link,
                descriptionKey: `home.logs.description.${link.id.replace('logs:', '')}`,
            }));
        default:
            return [];
    }
};

const buildAllTiles = (context: HomeTileContext) =>
    TILE_SOURCES.flatMap<HomeTile>(({ id, section, keys, glyph }) => {
        const { role, navItems } = context;
        const item = keys.map((key) => navItems.find((nav) => nav.key === key)).find(Boolean);

        if (!item) {
            return [];
        }

        const textRole = role === 'other' ? 'agency' : role;

        return [
            {
                id,
                section,
                to: item.to,
                glyph: id === 'organisation' && item.key === 'agency' ? 'counseling' : glyph,
                titleKey: `home.tile.${id}.title`,
                textKey: ROLE_SPECIFIC.has(id) ? `home.tile.${id}.${textRole}` : `home.tile.${id}.text`,
                links: linksFor(id, context),
            },
        ];
    });

/**
 * "Organisation" is about founding. When this admin cannot found anything
 * (e.g. a Beratungsstellen admin) it would only repeat "Bestehendes bearbeiten".
 */
const dropEmptyOrganisation = (tiles: HomeTile[]) =>
    tiles.some((tile) => tile.id === 'accounts')
        ? tiles.filter((tile) => tile.id !== 'organisation' || tile.links.length > 0)
        : tiles;

export const buildHomeTiles = (context: HomeTileContext) => dropEmptyOrganisation(buildAllTiles(context));

/** The one thing each level does first; leads to the same place as its tile shortcut. */
export interface HomeHeroAction {
    to: string;
    labelKey: string;
    kind: 'invite' | 'found';
}

const HERO_CANDIDATES: Record<HomeRole, Array<[HomeTileId, string, string, HomeHeroAction['kind']]>> = {
    platform: [['invite', 'links:tenants', 'home.hero.inviteTenant', 'invite']],
    // A Träger admin who may not found Beratungsstellen still invites.
    tenant: [
        ['organisation', 'found-agency', 'home.link.foundAgency', 'found'],
        ['invite', 'links:counsellor', 'home.link.invite.counsellor', 'invite'],
    ],
    agency: [['invite', 'links:counsellor', 'home.link.invite.counsellor', 'invite']],
    other: [],
};

/** Taken from the tiles, so the hero never offers what the tiles (and the navigation) hide. */
export const pickHeroAction = (role: HomeRole, tiles: HomeTile[]): HomeHeroAction | undefined =>
    HERO_CANDIDATES[role]
        .map(([tileId, linkId, labelKey, kind]) => {
            const link = tiles.find((tile) => tile.id === tileId)?.links.find((candidate) => candidate.id === linkId);
            return link ? { to: link.to, labelKey, kind } : undefined;
        })
        .find(Boolean);

export type StepState = 'done' | 'open' | 'unknown';

export type ChecklistStepId =
    | 'platform-appearance'
    | 'create-tenant'
    | 'invite-tenant-admins'
    | 'sign-dpa'
    | 'tenant-appearance'
    | 'check-mail-server'
    | 'create-agency'
    | 'complete-agency'
    | 'invite-counsellors';

export interface ChecklistStep {
    id: ChecklistStepId;
    labelKey: string;
    to: string;
    state: StepState;
}

const atLeastOne = (...counts: Array<number | undefined>): StepState => {
    if (counts.some((count) => (count ?? 0) > 0)) return 'done';
    return counts.every((count) => count === undefined) ? 'unknown' : 'open';
};

const fromFlag = (flag: boolean | undefined): StepState => {
    if (flag === undefined) return 'unknown';
    return flag ? 'done' : 'open';
};

const fromDpa = (status: DpaStatusFact | undefined): StepState => {
    if (status === 'VALID') return 'done';
    if (status === 'UNSIGNED' || status === 'OUTDATED' || status === 'MISSING') return 'open';
    return 'unknown';
};

const SETTINGS = routePathNames.themeSettings;

const buildRoleSteps = (role: HomeRole, facts: HomeFacts): ChecklistStep[] => {
    const step = (id: ChecklistStep['id'], to: string, state: StepState): ChecklistStep => ({
        id,
        labelKey: `home.checklist.${id}`,
        to,
        state,
    });
    const inviteCounsellors = step(
        'invite-counsellors',
        routePathNames.linksCounsellor,
        atLeastOne(facts.consultants, facts.acceptedCounsellorInvites),
    );

    const { ownTenant } = facts;
    // Name and claim live under Stammdaten, the logo under Erscheinungsbild: lead to
    // the tab where the missing part can actually be filled in.
    const appearance = (id: 'platform-appearance' | 'tenant-appearance') =>
        step(
            id,
            ownTenant?.masterDataComplete === false ? `${SETTINGS}/master-data` : `${SETTINGS}/general`,
            fromFlag(ownTenant?.appearanceComplete),
        );
    // Only a Träger with its own mail server has something to check here.
    const mailServer =
        ownTenant?.smtpMode === 'OWN'
            ? [step('check-mail-server', `${SETTINGS}/smtp`, fromFlag(ownTenant.smtpComplete))]
            : [];

    switch (role) {
        case 'platform':
            return [
                appearance('platform-appearance'),
                step('create-tenant', routePathNames.linksTenants, atLeastOne(facts.tenants)),
                step('invite-tenant-admins', routePathNames.linksTenants, atLeastOne(facts.acceptedTenantInvites)),
            ];
        case 'tenant':
            return [
                step('sign-dpa', `${SETTINGS}/legal`, fromDpa(facts.dpaStatus)),
                appearance('tenant-appearance'),
                ...mailServer,
                step('create-agency', routePathNames.agency, atLeastOne(facts.agencies)),
                inviteCounsellors,
            ];
        case 'agency':
            return [step('complete-agency', routePathNames.agency, fromFlag(facts.agencyComplete)), inviteCounsellors];
        default:
            return [];
    }
};

/** Nav section a step leads into; without it the step would link into a dead end. */
const STEP_AREA: Record<ChecklistStepId, string> = {
    'platform-appearance': 'theme',
    'sign-dpa': 'theme',
    'tenant-appearance': 'theme',
    'check-mail-server': 'theme',
    'complete-agency': 'agency',
    'create-tenant': 'links',
    'invite-tenant-admins': 'links',
    'create-agency': 'agency',
    'invite-counsellors': 'links',
};

/**
 * `settingsRoutes`: the settings tabs this admin can open. A step that leads into a
 * settings tab only shows when that tab is there (e.g. no appearance step when the
 * platform has not released appearance editing to Träger admins).
 */
export const buildChecklist = (
    role: HomeRole,
    facts: HomeFacts,
    navItems: AdminSidebarNavItem[],
    settingsRoutes?: string[],
): ChecklistStep[] =>
    buildRoleSteps(role, facts).filter(
        (step) =>
            navItems.some((item) => item.key === STEP_AREA[step.id]) &&
            (STEP_AREA[step.id] !== 'theme' || !settingsRoutes || settingsRoutes.includes(step.to)),
    );

export type SettingsGroupId = 'appearance' | 'communication' | 'access';

/**
 * Which group a settings tab belongs to, by the last segment of its route.
 * Three questions instead of four labels (ORISO-Admin#1374): how do we look,
 * what do we say and send, who may do what.
 */
const GROUP_BY_SEGMENT: Record<string, SettingsGroupId> = {
    general: 'appearance',
    'master-data': 'appearance',
    erstantwort: 'appearance',
    legal: 'communication',
    smtp: 'communication',
    'service-notices': 'communication',
    'global-config': 'access',
    permissions: 'access',
    'app-settings': 'access',
};

const GROUP_ORDER: SettingsGroupId[] = ['appearance', 'communication', 'access'];

export interface SettingsItem {
    to: string;
    labelKey: string;
    iconName?: string;
    /** One line: what the tab holds. Missing for a tab Home has no text for. */
    descriptionKey?: string;
    /** Set on the mail server tab only. */
    isMailServer?: boolean;
}

export interface SettingsGroup {
    id: SettingsGroupId;
    titleKey: string;
    items: SettingsItem[];
}

const segmentOf = (to: string) => to.split('/').filter(Boolean).pop() ?? '';

/** Tabs whose content Home describes; Funktionszugriff reads differently per level. */
const DESCRIBED_SEGMENTS = new Set([
    'global-config',
    'master-data',
    'general',
    'erstantwort',
    'legal',
    'smtp',
    'service-notices',
    'app-settings',
]);

const descriptionFor = (segment: string, role: HomeRole) => {
    if (segment === 'permissions')
        return `home.settings.description.permissions.${role === 'platform' ? 'platform' : 'tenant'}`;
    return DESCRIBED_SEGMENTS.has(segment) ? `home.settings.description.${segment}` : undefined;
};

export const groupSettingsTabs = (tabs: SettingsTab[], role: HomeRole = 'tenant'): SettingsGroup[] =>
    GROUP_ORDER.map((id) => ({
        id,
        titleKey: `home.settings.group.${id}`,
        items: tabs
            .filter((tab) => (GROUP_BY_SEGMENT[segmentOf(tab.to)] ?? 'access') === id)
            .map((tab) => ({
                to: tab.to,
                labelKey: tab.titleKey,
                iconName: tab.iconName,
                descriptionKey: descriptionFor(segmentOf(tab.to), role),
                isMailServer: segmentOf(tab.to) === 'smtp' || undefined,
            })),
    })).filter((group) => group.items.length > 0);

export type MailServerStatus = 'complete' | 'incomplete';

/**
 * Only a Träger with its own mail server has a status to show, and only when the
 * tenant service exposes the stored SMTP block. Whether a test mail arrived is not
 * stored anywhere, so Home says "complete", never "checked".
 */
export const mailServerStatus = (ownTenant?: OwnTenantFacts): MailServerStatus | undefined => {
    if (ownTenant?.smtpMode !== 'OWN' || ownTenant.smtpComplete === undefined) return undefined;
    return ownTenant.smtpComplete ? 'complete' : 'incomplete';
};
