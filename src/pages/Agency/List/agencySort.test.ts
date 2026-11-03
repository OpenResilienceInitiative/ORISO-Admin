import { describe, expect, it } from 'vite-plus/test';
import { AGENCY_SORT_FIELD_BY_COLUMN, agencySortOf, nextAgencySortState } from './agencySort';

const baseState: TableState = { current: 3, pageSize: 20, sortBy: undefined, order: undefined };

describe('AGENCY_SORT_FIELD_BY_COLUMN', () => {
    it('maps every sortable column to a sort field the AgencyService accepts', () => {
        expect(AGENCY_SORT_FIELD_BY_COLUMN).toEqual({
            id: 'ID',
            name: 'NAME',
            address: 'POST_CODE',
            status: 'OFFLINE',
        });
    });
});

describe('agencySortOf', () => {
    it('shows the arrow on the column the server sorts by', () => {
        expect(agencySortOf('ID', 'DESC')).toEqual({ key: 'id', direction: 'desc' });
        expect(agencySortOf('POST_CODE', 'ASC')).toEqual({ key: 'address', direction: 'asc' });
    });

    it('shows the server default (name A–Z) when no field is set', () => {
        expect(agencySortOf(undefined, undefined)).toEqual({ key: 'name', direction: 'asc' });
    });

    it('shows no arrow for a field without a column', () => {
        expect(agencySortOf('CREATE_DATE', 'ASC')).toBeNull();
    });
});

describe('nextAgencySortState', () => {
    it('sends the column API field and direction and returns to the first page', () => {
        expect(nextAgencySortState(baseState, { key: 'status', direction: 'desc' })).toEqual({
            ...baseState,
            current: 1,
            sortBy: 'OFFLINE',
            order: 'DESC',
        });
    });

    it('drops the sort for a column the API cannot order by', () => {
        expect(nextAgencySortState(baseState, { key: 'topics', direction: 'asc' })).toMatchObject({
            sortBy: undefined,
            order: undefined,
        });
    });
});
