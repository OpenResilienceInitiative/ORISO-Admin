import { describe, expect, it } from 'vitest';
import { AGENCY_SORT_FIELD_BY_DATA_INDEX, getAgencyColumnSortOrder, getNextAgencyTableState } from './agencySort';

const baseState: TableState = { current: 1, pageSize: 10, sortBy: undefined, order: undefined };

describe('AGENCY_SORT_FIELD_BY_DATA_INDEX', () => {
    it('maps every sortable column to its API sort field', () => {
        expect(AGENCY_SORT_FIELD_BY_DATA_INDEX).toEqual({
            id: 'ID',
            createDate: 'CREATEDATE',
            name: 'NAME',
            postcode: 'POSTCODE',
            city: 'CITY',
            offline: 'OFFLINE',
        });
    });
});

describe('getNextAgencyTableState', () => {
    it('sends server sort for the id column', () => {
        const next = getNextAgencyTableState(baseState, { current: 1, pageSize: 10 }, { field: 'id', order: 'ascend' });
        expect(next).toMatchObject({ sortBy: 'ID', order: 'ASC' });
    });

    it('sends server sort for the createDate column descending', () => {
        const next = getNextAgencyTableState(
            baseState,
            { current: 2, pageSize: 20 },
            { field: 'createDate', order: 'descend' },
        );
        expect(next).toMatchObject({ current: 2, pageSize: 20, sortBy: 'CREATEDATE', order: 'DESC' });
    });

    it('sends server sort for the offline column', () => {
        const next = getNextAgencyTableState(
            baseState,
            { current: 1, pageSize: 10 },
            { field: 'offline', order: 'ascend' },
        );
        expect(next).toMatchObject({ sortBy: 'OFFLINE', order: 'ASC' });
    });

    it('resets to unsorted when the sorter is cleared (third click)', () => {
        const sorted: TableState = { ...baseState, sortBy: 'ID', order: 'ASC' };
        const next = getNextAgencyTableState(sorted, { current: 1, pageSize: 10 }, { field: 'id', order: undefined });
        expect(next.sortBy).toBeUndefined();
        expect(next.order).toBeUndefined();
    });

    it('resets to unsorted for non-sortable columns', () => {
        const sorted: TableState = { ...baseState, sortBy: 'NAME', order: 'ASC' };
        const next = getNextAgencyTableState(
            sorted,
            { current: 1, pageSize: 10 },
            { field: 'status', order: 'ascend' },
        );
        expect(next.sortBy).toBeUndefined();
        expect(next.order).toBeUndefined();
    });

    it('supports antd multi-sorter arrays by using the first entry', () => {
        const next = getNextAgencyTableState(baseState, { current: 1, pageSize: 10 }, [
            { field: 'city', order: 'descend' },
        ]);
        expect(next).toMatchObject({ sortBy: 'CITY', order: 'DESC' });
    });
});

describe('getAgencyColumnSortOrder', () => {
    it('returns the arrow direction for the column matching the server sort', () => {
        const state: TableState = { ...baseState, sortBy: 'CREATEDATE', order: 'DESC' };
        expect(getAgencyColumnSortOrder('createDate', state)).toBe('descend');
        expect(getAgencyColumnSortOrder('id', state)).toBeUndefined();
    });

    it('returns ascend when the server sort is ASC', () => {
        const state: TableState = { ...baseState, sortBy: 'ID', order: 'ASC' };
        expect(getAgencyColumnSortOrder('id', state)).toBe('ascend');
    });

    it('returns undefined when nothing is sorted', () => {
        expect(getAgencyColumnSortOrder('id', baseState)).toBeUndefined();
    });
});
