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

const baseIdentityColumns = (): UserTableColumnConfig[] => [
    col('lastUpdated', true, true, 130),
    col('status', true, false, 60),
    col('lastname', true, true, 130),
    col('firstname', true, true, 120),
    col('email', true, true, 150),
    col('username', true, false, 150),
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
            col('agency', true, false, 250),
            col('tenant', true, false, 100),
            col('actions', true, false, 100),
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
            col('agency', true, false, 250),
            col('tenant', true, false, 100),
            col('actions', true, false, 100),
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
            ...baseIdentityColumns(),
            col('subdomain', true, false, 200),
            col('tenant', true, false, 100),
            col('actions', true, false, 100),
        ],
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
