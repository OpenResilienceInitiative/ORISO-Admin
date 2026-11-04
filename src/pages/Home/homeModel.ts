import routePathNames from '../../appConfig';
import type { HasRoleFn } from '../../constants/caseHandoverAccess';
import type { SettingsTab } from '../../constants/settingsTabs';
import { UserRole } from '../../enums/UserRole';
import type { NavGlyphName } from '../../components/NavGlyph';
import type { AdminSidebarNavItem } from '../../components/Layout/AdminSidebar';

/**
 * The model behind Home (ORISO-Admin#1323, spec: docs/home-dashboard-spec.md).
 *
 * Pure on purpose: tiles come from the nav items the layout already resolved
 * with the permission helpers, so Home can never offer an area the navigation
 * hides. Checklist steps are derived from counts, never stored.
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
export interface HomeFacts {
    tenants?: number;
    agencies?: number;
    consultants?: number;
    acceptedTenantInvites?: number;
    acceptedCounsellorInvites?: number;
    openInvites?: number;
    needsActionInvites?: number;
}

export type HomeTileId = 'organisation' | 'invite' | 'accounts' | 'settings' | 'statistics' | 'logs';

export interface HomeTile {
    id: HomeTileId;
    to: string;
    glyph: NavGlyphName;
    titleKey: string;
    textKey: string;
}

/** Nav keys per tile; the first key the admin has decides the link. */
const TILE_SOURCES: Array<{ id: HomeTileId; keys: string[]; glyph: NavGlyphName }> = [
    { id: 'organisation', keys: ['tenants', 'agency'], glyph: 'tenants' },
    { id: 'invite', keys: ['links'], glyph: 'links' },
    { id: 'accounts', keys: ['counselors'], glyph: 'users' },
    { id: 'settings', keys: ['theme'], glyph: 'displaySettings' },
    { id: 'statistics', keys: ['statistics'], glyph: 'statistics' },
    { id: 'logs', keys: ['logs'], glyph: 'logs' },
];

/** Explanations that differ per level; the rest share one text. */
const ROLE_SPECIFIC: ReadonlySet<HomeTileId> = new Set(['organisation', 'invite', 'accounts']);

export const buildHomeTiles = ({ role, navItems }: { role: HomeRole; navItems: AdminSidebarNavItem[] }) =>
    TILE_SOURCES.flatMap<HomeTile>(({ id, keys, glyph }) => {
        const item = keys.map((key) => navItems.find((nav) => nav.key === key)).find(Boolean);

        if (!item) {
            return [];
        }

        const textRole = role === 'other' ? 'agency' : role;

        return [
            {
                id,
                to: item.to,
                glyph: id === 'organisation' && item.key === 'agency' ? 'counseling' : glyph,
                titleKey: `home.tile.${id}.title`,
                textKey: ROLE_SPECIFIC.has(id) ? `home.tile.${id}.${textRole}` : `home.tile.${id}.text`,
            },
        ];
    });

export type StepState = 'done' | 'open' | 'unknown';

export interface ChecklistStep {
    id: 'create-tenant' | 'invite-tenant-admins' | 'create-agency' | 'invite-counsellors';
    labelKey: string;
    to: string;
    state: StepState;
}

const atLeastOne = (...counts: Array<number | undefined>): StepState => {
    if (counts.some((count) => (count ?? 0) > 0)) return 'done';
    return counts.every((count) => count === undefined) ? 'unknown' : 'open';
};

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

    switch (role) {
        case 'platform':
            return [
                step('create-tenant', routePathNames.tenants, atLeastOne(facts.tenants)),
                step('invite-tenant-admins', routePathNames.linksTenants, atLeastOne(facts.acceptedTenantInvites)),
            ];
        case 'tenant':
            return [step('create-agency', routePathNames.agency, atLeastOne(facts.agencies)), inviteCounsellors];
        case 'agency':
            return [inviteCounsellors];
        default:
            return [];
    }
};

/** Nav section a step leads into; without it the step would link into a dead end. */
const STEP_AREA: Record<ChecklistStep['id'], string> = {
    'create-tenant': 'tenants',
    'invite-tenant-admins': 'links',
    'create-agency': 'agency',
    'invite-counsellors': 'links',
};

export const buildChecklist = (role: HomeRole, facts: HomeFacts, navItems: AdminSidebarNavItem[]): ChecklistStep[] =>
    buildRoleSteps(role, facts).filter((step) => navItems.some((item) => item.key === STEP_AREA[step.id]));

export type SettingsGroupId = 'appearance' | 'legal' | 'technical' | 'functions';

/** Which group a settings tab belongs to, by the last segment of its route. */
const GROUP_BY_SEGMENT: Record<string, SettingsGroupId> = {
    general: 'appearance',
    'master-data': 'appearance',
    erstantwort: 'appearance',
    legal: 'legal',
    smtp: 'technical',
    'global-config': 'technical',
    'service-notices': 'technical',
    permissions: 'functions',
    'app-settings': 'functions',
};

const GROUP_ORDER: SettingsGroupId[] = ['appearance', 'legal', 'technical', 'functions'];

export interface SettingsGroup {
    id: SettingsGroupId;
    titleKey: string;
    items: Array<{ to: string; labelKey: string }>;
}

export const groupSettingsTabs = (tabs: SettingsTab[]): SettingsGroup[] =>
    GROUP_ORDER.map((id) => ({
        id,
        titleKey: `home.settings.group.${id}`,
        items: tabs
            .filter((tab) => (GROUP_BY_SEGMENT[tab.to.split('/').filter(Boolean).pop() ?? ''] ?? 'functions') === id)
            .map((tab) => ({ to: tab.to, labelKey: tab.titleKey })),
    })).filter((group) => group.items.length > 0);
