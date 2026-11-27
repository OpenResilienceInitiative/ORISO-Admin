import type { DataTableSort } from '../../../components/DataTable';

/** Columns the AgencyService search can order by, and the `field` value it expects for each. */
export const AGENCY_SORT_FIELD_BY_COLUMN: Record<string, string> = {
    id: 'ID',
    name: 'NAME',
    address: 'POST_CODE',
};

/**
 * The header arrow for the server order: without an explicit field the AgencyService sorts by name
 * (getAgencyData's default), a field without a column shows no arrow.
 */
export const agencySortOf = (sortBy: string | undefined, order: string | undefined): DataTableSort | null => {
    if (!sortBy) return { key: 'name', direction: order === 'DESC' ? 'desc' : 'asc' };
    const key = Object.keys(AGENCY_SORT_FIELD_BY_COLUMN).find(
        (column) => AGENCY_SORT_FIELD_BY_COLUMN[column] === sortBy,
    );
    return key ? { key, direction: order === 'DESC' ? 'desc' : 'asc' } : null;
};

/** The next list state for a header click: back to page 1, the column's API field and direction. */
export const nextAgencySortState = (state: TableState, sort: DataTableSort | null): TableState => {
    const sortBy = sort ? AGENCY_SORT_FIELD_BY_COLUMN[sort.key] : undefined;
    if (!sort || !sortBy) {
        return { ...state, current: 1, sortBy: undefined, order: undefined };
    }
    return { ...state, current: 1, sortBy, order: sort.direction === 'desc' ? 'DESC' : 'ASC' };
};
