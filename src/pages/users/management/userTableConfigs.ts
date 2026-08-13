import routePathNames from '../../../appConfig';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { USER_TABLE_DEFAULT_ORDER, USER_TABLE_DEFAULT_SORT } from '../../../constants/userTableSort';

export type UserTableSectionKind = 'users' | 'organizations';

export type UserTableColumnKey =
    | 'lastUpdated'
    | 'status'
    | 'lastname'
    | 'firstname'
    | 'email'
    | 'username'
    | 'agency'
    | 'tenant'
    | 'subdomain'
    | 'tenantOrgName'
    | 'tenantId'
    | 'maxConsultants'
    | 'hasOtherIdentity'
    | 'actions';

export interface UserTableColumnConfig {
    key: UserTableColumnKey;
    visible: boolean;
    sortable?: boolean;
    width?: number;
}

export interface UserTableSectionConfig {
    sectionId: TypeOfUser;
    sectionKind: UserTableSectionKind;
    readResource: Resource;
    createResource: Resource;
    updateResource: Resource;
    columns: UserTableColumnConfig[];
    defaultSort: { field: string; order: 'ASC' | 'DESC' };
    showAgencyExpand: boolean;
    showStatus: boolean;
    editPathPrefix: string;
    searchPlaceholderKey: string;
    emptyTextKey?: string;
    createLabelKey?: string;
}

const col = (key: UserTableColumnKey, visible: boolean, sortable = false, width?: number): UserTableColumnConfig => ({
    key,
    visible,
    sortable,
    width,
});

// Width budget: at 1440px the sidebar rail (128px, Figma 1285-80496) and the table padding
// leave ~1278px, so the fixed widths of a section must stay inside that. Anything wider
// silently pushes the trailing columns (Träger, "also …" checkmark, actions) out of sight
// (ORISO-Admin#99). Email and username truncate with an ellipsis, so they carry the trim.
const baseIdentityColumns = (): UserTableColumnConfig[] => [
    col('lastUpdated', true, true, 150),
    col('status', true, false, 80),
    col('lastname', true, true, 130),
    col('firstname', true, true, 120),
    col('email', true, true, 134),
    col('username', true, true, 134),
];

const tenantAdminIdentityColumns = (): UserTableColumnConfig[] => [
    col('lastUpdated', true, true, 150),
    col('status', true, false, 80),
    col('lastname', true, true, 130),
    col('firstname', true, true, 120),
    col('email', true, true, 134),
    col('username', true, false, 134),
];

const defaultSort: { field: string; order: 'ASC' | 'DESC' } = {
    field: USER_TABLE_DEFAULT_SORT,
    order: USER_TABLE_DEFAULT_ORDER,
};

const tenantOrgSort: { field: string; order: 'ASC' | 'DESC' } = {
    field: 'NAME',
    order: 'ASC',
};

export const USER_TABLE_CONFIGS: Record<TypeOfUser, UserTableSectionConfig> = {
    [TypeOfUser.Tenants]: {
        sectionId: TypeOfUser.Tenants,
        sectionKind: 'organizations',
        readResource: Resource.Tenant,
        createResource: Resource.Tenant,
        updateResource: Resource.Tenant,
        defaultSort: tenantOrgSort,
        showAgencyExpand: false,
        showStatus: false,
        editPathPrefix: routePathNames.tenants,
        searchPlaceholderKey: 'tenants.searchPlaceholder',
        emptyTextKey: 'tenants.list.empty',
        createLabelKey: 'tenants.list.new',
        columns: [
            col('tenantOrgName', true, true, 100),
            col('subdomain', true, false, 150),
            col('tenantId', true, false, 100),
            col('maxConsultants', true, false, 130),
            col('actions', true, false, 80),
        ],
    },
    [TypeOfUser.Consultants]: {
        sectionId: TypeOfUser.Consultants,
        sectionKind: 'users',
        readResource: Resource.Consultant,
        createResource: Resource.Consultant,
        updateResource: Resource.Consultant,
        defaultSort,
        showAgencyExpand: true,
        showStatus: true,
        editPathPrefix: '/admin/users/consultants',
        searchPlaceholderKey: 'consultant-search-placeholder',
        columns: [
            ...baseIdentityColumns(),
            col('agency', true, false, 220),
            col('hasOtherIdentity', true, false, 110),
            col('tenant', true, false, 120),
            col('actions', true, false, 80),
        ],
    },
    [TypeOfUser.AgencyAdmins]: {
        sectionId: TypeOfUser.AgencyAdmins,
        sectionKind: 'users',
        readResource: Resource.AgencyAdminUser,
        createResource: Resource.AgencyAdminUser,
        updateResource: Resource.AgencyAdminUser,
        defaultSort,
        showAgencyExpand: true,
        showStatus: true,
        editPathPrefix: '/admin/users/agency-admins',
        searchPlaceholderKey: 'consultant-search-placeholder',
        columns: [
            ...baseIdentityColumns(),
            col('agency', true, false, 220),
            col('hasOtherIdentity', true, false, 110),
            col('tenant', true, false, 120),
            col('actions', true, false, 80),
        ],
    },
    [TypeOfUser.TenantAdmins]: {
        sectionId: TypeOfUser.TenantAdmins,
        sectionKind: 'users',
        readResource: Resource.TenantAdminUser,
        createResource: Resource.TenantAdminUser,
        updateResource: Resource.TenantAdminUser,
        defaultSort,
        showAgencyExpand: false,
        showStatus: true,
        editPathPrefix: '/admin/users/tenant-admins',
        searchPlaceholderKey: 'consultant-search-placeholder',
        columns: [
            ...tenantAdminIdentityColumns(),
            col('subdomain', true, false, 160),
            col('hasOtherIdentity', true, false, 110),
            col('tenant', true, false, 120),
            col('actions', true, false, 80),
        ],
    },
    [TypeOfUser.PlatformAdmins]: {
        sectionId: TypeOfUser.PlatformAdmins,
        sectionKind: 'users',
        readResource: Resource.TenantAdminUser,
        createResource: Resource.TenantAdminUser,
        updateResource: Resource.TenantAdminUser,
        defaultSort,
        showAgencyExpand: false,
        showStatus: true,
        editPathPrefix: routePathNames.platformAdmins,
        searchPlaceholderKey: 'consultant-search-placeholder',
        columns: [...tenantAdminIdentityColumns(), col('actions', true, false, 80)],
    },
    [TypeOfUser.Users]: {
        sectionId: TypeOfUser.Users,
        sectionKind: 'users',
        readResource: Resource.Consultant,
        createResource: Resource.Consultant,
        updateResource: Resource.Consultant,
        defaultSort,
        showAgencyExpand: false,
        showStatus: false,
        editPathPrefix: '/admin/users',
        searchPlaceholderKey: 'consultant-search-placeholder',
        columns: baseIdentityColumns(),
    },
};

export const getVisibleColumns = (sectionId: TypeOfUser, options: { showTenant: boolean; showSubdomain: boolean }) => {
    const config = USER_TABLE_CONFIGS[sectionId];
    return config.columns.filter((column) => {
        if (!column.visible) return false;
        if (column.key === 'tenant' && !options.showTenant) return false;
        if (column.key === 'subdomain' && !options.showSubdomain) return false;
        return true;
    });
};

export const canReadSection = (sectionId: TypeOfUser, can: (action: PermissionAction, resource: Resource) => boolean) =>
    can(PermissionAction.Read, USER_TABLE_CONFIGS[sectionId].readResource);
