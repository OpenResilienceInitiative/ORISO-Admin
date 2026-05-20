import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { USER_TABLE_API_SAFE_ORDER, USER_TABLE_API_SAFE_SORT } from '../constants/userTableSort';
import { CounselorData } from '../types/counselor';
import { HalResponseList, ResponseList } from '../types/ResponseList';
import removeEmbedded from './removeEmbedded';

type FetchUserSearchParams = {
    url: string;
    sortBy?: string;
    order?: string;
    current?: number;
    pageSize?: number;
};

const emptyList = (current = 1, pageSize = 10): ResponseList<CounselorData> => ({
    data: [],
    total: 0,
    page: current,
    perPage: pageSize,
});

export const fetchUserSearchWithSortFallback = async ({
    url,
    sortBy,
    order,
    current = 1,
    pageSize = 10,
}: FetchUserSearchParams): Promise<ResponseList<CounselorData>> => {
    const field = sortBy || USER_TABLE_API_SAFE_SORT;
    const sortOrder = order || USER_TABLE_API_SAFE_ORDER;

    const request = (sortField: string, sortDirection: string) =>
        fetchData({
            url: `${url}&order=${sortDirection}&field=${sortField}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [],
        }).then((result: HalResponseList<CounselorData>) => removeEmbedded(result) as ResponseList<CounselorData>);

    try {
        return await request(field, sortOrder);
    } catch {
        if (field === USER_TABLE_API_SAFE_SORT && sortOrder === USER_TABLE_API_SAFE_ORDER) {
            return emptyList(current, pageSize);
        }
        try {
            return await request(USER_TABLE_API_SAFE_SORT, USER_TABLE_API_SAFE_ORDER);
        } catch {
            return emptyList(current, pageSize);
        }
    }
};
