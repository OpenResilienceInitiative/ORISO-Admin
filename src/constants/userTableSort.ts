/** API-safe default (works on all deployed UserService versions). */
export const USER_TABLE_API_SAFE_SORT = 'FIRSTNAME';
export const USER_TABLE_API_SAFE_ORDER = 'ASC';

/** Tenant admin search only supports these sort fields (see useradminservice.yaml). */
export const TENANT_ADMIN_ALLOWED_SORT_FIELDS = ['FIRSTNAME', 'LASTNAME', 'EMAIL', 'TENANT_ID'] as const;

/** Preferred default once `UPDATE_DATE` is deployed everywhere. */
export const USER_TABLE_PREFERRED_SORT = 'UPDATE_DATE';
export const USER_TABLE_PREFERRED_ORDER = 'DESC';

export const USER_TABLE_DEFAULT_SORT = USER_TABLE_API_SAFE_SORT;
export const USER_TABLE_DEFAULT_ORDER = USER_TABLE_API_SAFE_ORDER;

export const normalizeTenantAdminSortField = (field?: string): string => {
    const normalized = (field || USER_TABLE_API_SAFE_SORT).toUpperCase();
    if ((TENANT_ADMIN_ALLOWED_SORT_FIELDS as readonly string[]).includes(normalized)) {
        return normalized;
    }
    return USER_TABLE_API_SAFE_SORT;
};
