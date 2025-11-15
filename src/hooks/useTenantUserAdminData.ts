import { QueryOptions, useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminsEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { HalResponse } from '../types/ResponseList';

interface ConsultantsDataProps extends UseQueryOptions<CounselorData> {
    id: string;
}
export const TENANT_ADMIN_QUERY_KEY = 'TENANT_ADMIN';

export const useTenantUserAdminData = ({ id, ...options }: ConsultantsDataProps) => {
    return useQuery(
        [TENANT_ADMIN_QUERY_KEY, id],
        () => {
            return fetchData({
                url: `${tenantAdminsEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
                // eslint-disable-next-line no-underscore-dangle
            }).then((result: HalResponse<CounselorData>) => result?._embedded as CounselorData);
        },
        options as QueryOptions<CounselorData>,
    );
};
