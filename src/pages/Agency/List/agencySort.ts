import { TablePaginationConfig } from 'antd';

export const AGENCY_SORT_FIELD_BY_DATA_INDEX: Record<string, string> = {
    id: 'ID',
    createDate: 'CREATEDATE',
    name: 'NAME',
    postcode: 'POSTCODE',
    city: 'CITY',
    offline: 'OFFLINE',
};

export const getAgencyColumnSortOrder = (
    dataIndex: keyof typeof AGENCY_SORT_FIELD_BY_DATA_INDEX,
    tableState: TableState,
): 'ascend' | 'descend' | undefined => {
    if (!tableState.sortBy || tableState.sortBy !== AGENCY_SORT_FIELD_BY_DATA_INDEX[dataIndex]) {
        return undefined;
    }

    return tableState.order === 'DESC' ? 'descend' : 'ascend';
};

export const getNextAgencyTableState = (
    tableState: TableState,
    pagination: TablePaginationConfig,
    sorter: any,
): TableState => {
    const { current, pageSize } = pagination;

    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField =
        activeSorter?.field && typeof activeSorter.field === 'string'
            ? AGENCY_SORT_FIELD_BY_DATA_INDEX[activeSorter.field]
            : undefined;

    if (!sortField || !activeSorter?.order) {
        return { ...tableState, current, pageSize, sortBy: undefined, order: undefined };
    }

    return {
        ...tableState,
        current,
        pageSize,
        sortBy: sortField,
        order: activeSorter.order === 'descend' ? 'DESC' : 'ASC',
    };
};
