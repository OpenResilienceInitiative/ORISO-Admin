import { describe, expect, it } from 'vite-plus/test';
import { nextTenantSortState, tenantSortOf } from './tenantSort';

const baseState: TableState = { current: 4, pageSize: 10, sortBy: undefined, order: undefined };

describe('tenant list sort', () => {
    it('sends the TenantService field of the clicked column and returns to the first page', () => {
        expect(nextTenantSortState(baseState, { key: 'id', direction: 'desc' })).toEqual({
            ...baseState,
            current: 1,
            sortBy: 'ID',
            order: 'DESC',
        });
    });

    it('drops the sort for a column the TenantService cannot order by', () => {
        expect(nextTenantSortState(baseState, { key: 'created', direction: 'asc' })).toMatchObject({
            sortBy: undefined,
            order: undefined,
        });
    });

    it('shows the arrow only on a column the server sorts by', () => {
        expect(tenantSortOf('ID', 'ASC')).toEqual({ key: 'id', direction: 'asc' });
        expect(tenantSortOf('SUBDOMAIN', 'ASC')).toBeNull();
        expect(tenantSortOf('UNKNOWN', 'ASC')).toBeNull();
    });

    it('shows the server default (name A–Z) when no field is set', () => {
        expect(tenantSortOf(undefined, undefined)).toEqual({ key: 'name', direction: 'asc' });
    });
});
