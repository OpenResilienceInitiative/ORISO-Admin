import { describe, expect, it } from 'vitest';
import {
    TENANT_ADMIN_ALLOWED_SORT_FIELDS,
    USER_TABLE_API_SAFE_ORDER,
    USER_TABLE_API_SAFE_SORT,
    USER_TABLE_DEFAULT_ORDER,
    USER_TABLE_DEFAULT_SORT,
    USER_TABLE_PREFERRED_ORDER,
    USER_TABLE_PREFERRED_SORT,
    normalizeTenantAdminSortField,
} from './userTableSort';

describe('user table sort constants', () => {
    it('keeps preferred defaults aligned with the exported default sort values', () => {
        expect(USER_TABLE_DEFAULT_SORT).toBe(USER_TABLE_PREFERRED_SORT);
        expect(USER_TABLE_DEFAULT_ORDER).toBe(USER_TABLE_PREFERRED_ORDER);
        expect(USER_TABLE_API_SAFE_SORT).toBe('FIRSTNAME');
        expect(USER_TABLE_API_SAFE_ORDER).toBe('ASC');
    });

    it('allows only tenant admin API supported sort fields', () => {
        expect(TENANT_ADMIN_ALLOWED_SORT_FIELDS).toEqual([
            'FIRSTNAME',
            'LASTNAME',
            'EMAIL',
            'TENANT_ID',
            'UPDATE_DATE',
        ]);
    });

    it('normalizes allowed sort fields case-insensitively', () => {
        expect(normalizeTenantAdminSortField('email')).toBe('EMAIL');
        expect(normalizeTenantAdminSortField('update_date')).toBe('UPDATE_DATE');
    });

    it('falls back to the API-safe sort field for unsupported fields', () => {
        expect(normalizeTenantAdminSortField('created_at')).toBe(USER_TABLE_API_SAFE_SORT);
    });
});
