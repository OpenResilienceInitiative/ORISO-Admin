import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
import { agencyAdminsSearchEndpoint, usersConsultantsSearchEndpoint } from '../appConfig';
import { USER_TABLE_DEFAULT_ORDER, USER_TABLE_DEFAULT_SORT } from '../constants/userTableSort';
import { TypeOfUser } from '../enums/TypeOfUser';
import { CounselorData } from '../types/counselor';
import { ResponseList } from '../types/ResponseList';
import { fetchUserSearchWithSortFallback } from '../utils/fetchUserSearchWithSortFallback';

interface ConsultantsDataProps extends UseQueryOptions<ResponseList<CounselorData>> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
    typeOfUser: TypeOfUser;
}

export const useConsultantsOrAdminsData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    typeOfUser = TypeOfUser.Consultants,
    ...options
}: ConsultantsDataProps) => {
    const baseUrl = typeOfUser === TypeOfUser.Consultants ? usersConsultantsSearchEndpoint : agencyAdminsSearchEndpoint;

    return useQuery(
        [typeOfUser.toUpperCase(), search, current, sortBy, order, pageSize],
        () =>
            fetchUserSearchWithSortFallback({
                url: `${baseUrl}?query=${encodeURIComponent(search || '*')}&page=${current || 1}&perPage=${
                    pageSize || 10
                }`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                current,
                pageSize,
            }),
        {
            ...options,
            retry: false,
            refetchOnWindowFocus: false,
        } as QueryOptions<ResponseList<CounselorData>>,
    );
};
