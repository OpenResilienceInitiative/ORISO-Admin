import routePathNames from '../../appConfig';
import {
    canReadCaseHandoverAdmin,
    canSeeDeletionAuditLogsFor,
    canSeeSupervisorLogs,
    type CanFn,
    type HasRoleFn,
} from '../../constants/caseHandoverAccess';
import { resolveVisibleLinksTabs, type LinksTabKey } from '../../constants/linksAccess';
import { getSettingsTabs } from '../../constants/settingsTabs';
import { getUserSections } from '../../constants/userSections';

/** One destination inside a section, still untranslated. */
export interface AdminNavSubsection {
    /** Stable id, also the key into `NAV_KEYWORDS`. */
    id: string;
    to: string;
    labelKey: string;
    /** Used when `labelKey` has no translation. */
    fallbackKey?: string;
}

export interface AdminNavTreeContext {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
    can: CanFn;
    canManageServiceNotices: boolean;
    shouldShowThemeSettings: boolean;
    isTenantSettingsEditEnabled: boolean;
    multitenancyWithSingleDomainEnabled: boolean;
}

const LINK_TAB_ROUTES: Record<LinksTabKey, { to: string; labelKey: string }> = {
    tenants: { to: routePathNames.linksTenants, labelKey: 'links.tabs.tenants' },
    counsellor: { to: routePathNames.linksCounsellor, labelKey: 'links.tabs.counsellor' },
};

/** `/admin/theme-settings/smtp` → `smtp`; the service notices route → `service-notices`. */
const settingsId = (to: string) => `settings:${to.split('/').filter(Boolean).pop()}`;

/**
 * Subsections of every top-level section, for the mobile menu and its search
 * (ORISO-Admin#1319).
 *
 * The pages publish their subsections only while they are mounted
 * (`useRegisterMobileNav`), but the menu must show the subsections of sections
 * you are *not* on. So this builds them up front, from the same permission
 * helpers the pages themselves use — never a second, drifting copy of the
 * rules: settings from `getSettingsTabs`, accounts from `getUserSections`,
 * links from `resolveVisibleLinksTabs`, logs from the gates `App.tsx` routes on.
 */
export const buildAdminNavTree = (context: AdminNavTreeContext): Record<string, AdminNavSubsection[]> => {
    const { can, hasRole, isSuperAdmin } = context;

    const settings = getSettingsTabs({
        isSuperAdmin,
        canManageServiceNotices: context.canManageServiceNotices,
        shouldShowThemeSettings: context.shouldShowThemeSettings,
        can,
        isTenantSettingsEditEnabled: context.isTenantSettingsEditEnabled,
        multitenancyWithSingleDomainEnabled: context.multitenancyWithSingleDomainEnabled,
    }).map((tab) => ({ id: settingsId(tab.to), to: tab.to, labelKey: tab.titleKey }));

    const users = getUserSections({ isSuperAdmin, can }).map((section) => ({
        id: `users:${section.id}`,
        to: section.to,
        labelKey: section.labelKey,
    }));

    const links = resolveVisibleLinksTabs({ isSuperAdmin, hasRole }).map((key) => ({
        id: `links:${key}`,
        ...LINK_TAB_ROUTES[key],
    }));

    const logs: AdminNavSubsection[] = [];

    if (canSeeSupervisorLogs(isSuperAdmin, can)) {
        logs.push({
            id: 'logs:supervisors',
            to: routePathNames.logs,
            labelKey: 'sidebar.supervisorLogs',
            fallbackKey: 'logs.supervisors.subTitle',
        });
    }
    if (canReadCaseHandoverAdmin(isSuperAdmin, can)) {
        logs.push({
            id: 'logs:case-handover',
            to: routePathNames.caseHandoverLogs,
            labelKey: 'sidebar.caseHandoverLogs',
            fallbackKey: 'caseHandoverLogs.title',
        });
    }
    if (isSuperAdmin) {
        logs.push({
            id: 'logs:inactive',
            to: routePathNames.inactiveAccountAuditLogs,
            labelKey: 'sidebar.inactiveAudit',
            fallbackKey: 'inactiveAudit.title',
        });
    }
    if (canSeeDeletionAuditLogsFor(isSuperAdmin, can)) {
        logs.push({
            id: 'logs:deletions',
            to: routePathNames.deletionAuditLogs,
            labelKey: 'sidebar.deletionAudit',
            fallbackKey: 'deletionAudit.title',
        });
    }

    // A section with a single destination is a plain page: nothing to expand.
    const onlyIfSeveral = (list: AdminNavSubsection[]) => (list.length > 1 ? list : []);

    return {
        theme: onlyIfSeveral(settings),
        counselors: onlyIfSeveral(users),
        links: onlyIfSeveral(links),
        logs: onlyIfSeveral(logs),
    };
};
