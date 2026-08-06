import { fetchData, FETCH_METHODS } from '../api/fetchData';
import {
    USER_TABLE_API_SAFE_ORDER,
    USER_TABLE_API_SAFE_SORT,
    USER_TABLE_DEFAULT_ORDER,
} from '../constants/userTableSort';
import { CounselorData } from '../types/counselor';
import { HalResponseList, ResponseList } from '../types/ResponseList';
import removeEmbedded from './removeEmbedded';

type FetchUserSearchParams = {
    url: string;
    sortBy?: string;
    order?: string;
    current?: number;
    pageSize?: number;
    normalizeSortField?: (field?: string) => string;
    rethrowOnFailure?: boolean;
};

const emptyList = (): ResponseList<CounselorData> => ({
    data: [],
    total: 0,
});

export const fetchUserSearchWithSortFallback = async ({
    url,
    sortBy,
    order,
    normalizeSortField,
    rethrowOnFailure = false,
}: FetchUserSearchParams): Promise<ResponseList<CounselorData>> => {
    const resolveField = normalizeSortField ?? ((field?: string) => field || USER_TABLE_API_SAFE_SORT);
    const field = resolveField(sortBy);
    const sortOrder = order || USER_TABLE_DEFAULT_ORDER;

    const request = (sortField: string, sortDirection: string) =>
        fetchData({
            url: `${url}&order=${sortDirection}&field=${sortField}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [],
        }).then((result: HalResponseList<CounselorData>) => removeEmbedded(result) as ResponseList<CounselorData>);

    try {
        return await request(field, sortOrder);
    } catch (primaryError) {
        if (field === USER_TABLE_API_SAFE_SORT && sortOrder === USER_TABLE_API_SAFE_ORDER) {
            if (rethrowOnFailure) {
                throw primaryError;
            }
            return emptyList();
        }
        try {
            return await request(USER_TABLE_API_SAFE_SORT, USER_TABLE_API_SAFE_ORDER);
        } catch (fallbackError) {
            if (rethrowOnFailure) {
                throw fallbackError;
            }
            return emptyList();
        }
    }
};
