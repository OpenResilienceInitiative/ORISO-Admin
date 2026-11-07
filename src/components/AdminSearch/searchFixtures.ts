import routePathNames from '../../appConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import enAssistant from '../../locales/en/assistant.json';
import enTranslation from '../../locales/en/translation.json';
import deAssistant from '../../locales/de/assistant.json';
import deTranslation from '../../locales/de/translation.json';
import { canFor, hasRoleFor, type PermissionGrant } from '../Layout/adminNavFixtures';
import { buildAdminNavItems } from '../Layout/adminNavItems';
import { buildAdminNavTree } from '../Layout/adminNavTree';
import { getDefaultSettingsPath } from '../../constants/settingsTabs';
import { buildSearchIndex, type Translate } from './buildSearchIndex';
import { prepareIndex } from './searchEngine';
import type { SearchContext } from './searchRegistry';
import type { SearchDoc } from './searchTypes';

/**
 * Role fixtures for the search: tests, stories and screenshots build the index the
 * way the app does (real `buildAdminNavItems` / `buildAdminNavTree`, real locale
 * files), so a role in a story sees exactly what that role sees in the product.
 */

type Texts = Record<string, string>;

const LOCALES: Record<'de' | 'en', Texts> = {
    en: { ...(enTranslation as Texts), ...(enAssistant as Texts) },
    de: { ...(deTranslation as Texts), ...(deAssistant as Texts) },
};

/** Translate backed by the real German and English files; `current` is the UI language. */
export const fixtureTranslate =
    (current: 'de' | 'en' = 'en'): Translate =>
    (language, key) => {
        const value = LOCALES[language === 'current' ? current : language][key];

        return typeof value === 'string' && value !== '' ? value : undefined;
    };

export type FixtureRole = 'platform' | 'tenant' | 'agency' | 'tenantReadOnly';

interface RoleSpec {
    isSuperAdmin: boolean;
    roles: UserRole[];
    grants: PermissionGrant[];
    canManageServiceNotices: boolean;
    shouldShowThemeSettings: boolean;
}

const all = [
    Resource.Tenant,
    Resource.Agency,
    Resource.Consultant,
    Resource.AgencyAdminUser,
    Resource.TenantAdminUser,
    Resource.Topic,
    Resource.Statistic,
    Resource.LegalText,
    Resource.Language,
];

const ROLE_SPECS: Record<FixtureRole, RoleSpec> = {
    platform: {
        isSuperAdmin: true,
        roles: [],
        grants: all,
        canManageServiceNotices: true,
        shouldShowThemeSettings: false,
    },
    tenant: {
        isSuperAdmin: false,
        roles: [UserRole.TenantAdmin],
        grants: [
            { action: PermissionAction.Read, resource: Resource.Tenant },
            { action: PermissionAction.Update, resource: Resource.Tenant },
            Resource.Agency,
            Resource.Consultant,
            Resource.AgencyAdminUser,
            Resource.Statistic,
            Resource.Topic,
            Resource.LegalText,
            Resource.Language,
        ],
        canManageServiceNotices: false,
        shouldShowThemeSettings: true,
    },
    tenantReadOnly: {
        isSuperAdmin: false,
        roles: [UserRole.TenantAdmin],
        grants: [
            { action: PermissionAction.Read, resource: Resource.Tenant },
            { action: PermissionAction.Read, resource: Resource.Agency },
            { action: PermissionAction.Read, resource: Resource.LegalText },
        ],
        canManageServiceNotices: false,
        shouldShowThemeSettings: true,
    },
    agency: {
        isSuperAdmin: false,
        roles: [UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin],
        grants: [Resource.Agency, Resource.Consultant, { action: PermissionAction.Read, resource: Resource.LegalText }],
        canManageServiceNotices: false,
        shouldShowThemeSettings: false,
    },
};

export interface FixtureOptions {
    role: FixtureRole;
    language?: 'de' | 'en';
    singleDomain?: boolean;
    tenant?: SearchContext['tenant'];
    agency?: SearchContext['agency'];
}

export const buildFixtureContext = ({ role, singleDomain = true, tenant, agency }: FixtureOptions) => {
    const spec = ROLE_SPECS[role];
    const can = canFor(...spec.grants);
    const hasRole = hasRoleFor(...spec.roles);
    const settingsContext = {
        isSuperAdmin: spec.isSuperAdmin,
        canManageServiceNotices: spec.canManageServiceNotices,
        shouldShowThemeSettings: spec.shouldShowThemeSettings,
        can,
        isTenantSettingsEditEnabled: true,
        multitenancyWithSingleDomainEnabled: singleDomain,
    };
    const items = buildAdminNavItems({
        isSuperAdmin: spec.isSuperAdmin,
        hasRole,
        can,
        labels: {
            account: '',
            agency: '',
            home: '',
            links: '',
            logs: '',
            settings: '',
            statistics: '',
            tenants: '',
            users: '',
        },
        settingsPath: getDefaultSettingsPath(settingsContext),
    });
    const tree = buildAdminNavTree({
        isSuperAdmin: spec.isSuperAdmin,
        hasRole,
        can,
        canManageServiceNotices: spec.canManageServiceNotices,
        shouldShowThemeSettings: spec.shouldShowThemeSettings,
        isTenantSettingsEditEnabled: true,
        multitenancyWithSingleDomainEnabled: singleDomain,
    });
    const context: SearchContext = {
        isSuperAdmin: spec.isSuperAdmin,
        isTenantAdmin: hasRole(UserRole.TenantAdmin),
        singleDomain,
        can,
        navTo: { ...Object.fromEntries(items.map((item) => [item.key, item.to])), account: routePathNames.userProfile },
        subTo: Object.fromEntries(
            Object.values(tree)
                .flat()
                .map((sub) => [sub.id, sub.to]),
        ),
        tenant,
        agency,
    };

    return { context, tree };
};

/** The index one role sees, in the given UI language. */
export const buildFixtureIndex = (options: FixtureOptions): SearchDoc[] => {
    const { context, tree } = buildFixtureContext(options);

    return buildSearchIndex({ context, tree, translate: fixtureTranslate(options.language ?? 'en') });
};

export const buildFixturePrepared = (options: FixtureOptions) => prepareIndex(buildFixtureIndex(options));
