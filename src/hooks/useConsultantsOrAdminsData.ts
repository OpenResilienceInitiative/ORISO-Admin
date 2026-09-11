import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { agencyAdminsSearchEndpoint, tenantAdminsSearchEndpoint, usersConsultantsSearchEndpoint } from '../appConfig';
import { USER_TABLE_DEFAULT_ORDER, USER_TABLE_DEFAULT_SORT } from '../constants/userTableSort';
import { TypeOfUser } from '../enums/TypeOfUser';
import { CounselorData } from '../types/counselor';
import { ResponseList } from '../types/ResponseList';
import { fetchUserSearchWithSortFallback } from '../utils/fetchUserSearchWithSortFallback';

interface ConsultantsDataProps extends Omit<UseQueryOptions<ResponseList<CounselorData>>, 'queryKey' | 'queryFn'> {
    search?: string;
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
    typeOfUser: TypeOfUser;
    /**
     * Let a failed search reject instead of resolving to an empty list. The default (false) keeps
     * list pages rendering an empty table on an outage; a caller that must tell "nobody matched"
     * apart from "the request failed" opts in and reads `isError`.
     */
    rethrowOnFailure?: boolean;
}

export const useConsultantsOrAdminsData = ({
    search,
    current,
    sortBy,
    order,
    pageSize,
    typeOfUser = TypeOfUser.Consultants,
    rethrowOnFailure = false,
    ...options
}: ConsultantsDataProps) => {
    const baseUrlByTypeOfUser = {
        [TypeOfUser.Consultants]: usersConsultantsSearchEndpoint,
        [TypeOfUser.TenantAdmins]: tenantAdminsSearchEndpoint,
    };
    const baseUrl = baseUrlByTypeOfUser[typeOfUser] ?? agencyAdminsSearchEndpoint;

    return useQuery({
        queryKey: [typeOfUser.toUpperCase(), search, current, sortBy, order, pageSize, rethrowOnFailure],
        queryFn: () =>
            fetchUserSearchWithSortFallback({
                url: `${baseUrl}?query=${encodeURIComponent(search || '*')}&page=${current || 1}&perPage=${
                    pageSize || 10
                }`,
                sortBy: sortBy || USER_TABLE_DEFAULT_SORT,
                order: order || USER_TABLE_DEFAULT_ORDER,
                current,
                pageSize,
                rethrowOnFailure,
            }),
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });
};
