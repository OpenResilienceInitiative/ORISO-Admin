import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, useLocation } from 'react-router-dom';
import routePathNames from '../../appConfig';
import { useAppConfigContext } from '../../context/useAppConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { useSingleTenantData } from '../../hooks/useSingleTenantData';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import type { AdminSidebarNavItem } from '../Layout/AdminSidebar';
import type { AdminNavSubsection } from '../Layout/adminNavTree';
import { buildSearchIndex, type Translate } from './buildSearchIndex';
import type { SearchContext } from './searchRegistry';
import type { SearchDoc } from './searchTypes';

export interface UseAdminSearchIndexInput {
    navItems: AdminSidebarNavItem[];
    account?: AdminSidebarNavItem;
    tree: Record<string, AdminNavSubsection[]>;
}

const idFromRoute = (pathname: string, base: string): string | undefined => {
    const id = matchPath({ path: `${base}/:id/*`, end: false }, pathname)?.params.id;

    return id && id !== 'add' ? id : undefined;
};

/**
 * The searchable index for the signed-in admin: what the layout already resolved for
 * navigation (`navItems`, `tree`: permission-filtered by the same builders the sidebar
 * uses), plus the tenant/agency the admin is looking at right now.
 */
export const useAdminSearchIndex = ({ navItems, account, tree }: UseAdminSearchIndexInput): SearchDoc[] => {
    const { i18n } = useTranslation();
    const { settings } = useAppConfigContext();
    const { can } = useUserPermissions();
    const { hasRole, isSuperAdmin, isTechnicalAccount, isTenantScopedAdmin } = useUserRoles();
    const { pathname } = useLocation();

    const tenantId = isSuperAdmin ? idFromRoute(pathname, routePathNames.tenants) : undefined;
    const agencyRouteId = idFromRoute(pathname, routePathNames.agency);
    const { data: tenantData } = useSingleTenantData({ id: tenantId ?? '', enabled: !!tenantId });

    // A Beratungsstellen admin with exactly one agency has an agency "in context" all the time.
    const isAgencyAdminOnly = !isSuperAdmin && !isTenantScopedAdmin && !hasRole(UserRole.TenantAdmin);
    const lookupOwnAgency = isAgencyAdminOnly && can(PermissionAction.Read, Resource.Agency) && !agencyRouteId;
    const { data: ownAgencies } = useAgenciesData({ current: 1, pageSize: 2, enabled: lookupOwnAgency });
    const onlyAgency = ownAgencies?.total === 1 ? ownAgencies.data[0] : undefined;
    const ownAgencyContext = onlyAgency?.id ? { id: String(onlyAgency.id), name: onlyAgency.name } : undefined;
    const agencyInContext = agencyRouteId ? { id: agencyRouteId } : ownAgencyContext;

    const language = i18n.resolvedLanguage || i18n.language;

    return useMemo(() => {
        const context: SearchContext = {
            isSuperAdmin,
            isTenantAdmin: hasRole(UserRole.TenantAdmin),
            isTechnicalAccount,
            hasRole,
            documentationEnabled: !!settings.documentationEnabled,
            singleDomain: settings.multitenancyWithSingleDomainEnabled,
            can,
            navTo: Object.fromEntries([...navItems, ...(account ? [account] : [])].map((item) => [item.key, item.to])),
            subTo: Object.fromEntries(
                Object.values(tree)
                    .flat()
                    .map((sub) => [sub.id, sub.to]),
            ),
            tenant: tenantId ? { id: tenantId, name: tenantData?.name } : undefined,
            agency: agencyInContext,
        };
        const translate: Translate = (lng, key) => {
            const value = i18n.t(key, { lng: lng === 'current' ? language : lng, defaultValue: '' }) as string;

            return value || undefined;
        };

        return buildSearchIndex({ context, tree, translate });
        // `can` and `hasRole` are fresh functions every render; what they decide only changes with the token.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        account,
        agencyRouteId,
        i18n,
        isSuperAdmin,
        isTechnicalAccount,
        language,
        navItems,
        onlyAgency?.id,
        settings.documentationEnabled,
        settings.multitenancyWithSingleDomainEnabled,
        tenantData?.name,
        tenantId,
        tree,
    ]);
};
