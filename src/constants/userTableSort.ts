/** API-safe default (works on all deployed UserService versions). */
export const USER_TABLE_API_SAFE_SORT = 'FIRSTNAME';
export const USER_TABLE_API_SAFE_ORDER = 'ASC';

/** Preferred default once `UPDATE_DATE` is deployed everywhere. */
export const USER_TABLE_PREFERRED_SORT = 'UPDATE_DATE';
export const USER_TABLE_PREFERRED_ORDER = 'DESC';

export const USER_TABLE_DEFAULT_SORT = USER_TABLE_API_SAFE_SORT;
export const USER_TABLE_DEFAULT_ORDER = USER_TABLE_API_SAFE_ORDER;
