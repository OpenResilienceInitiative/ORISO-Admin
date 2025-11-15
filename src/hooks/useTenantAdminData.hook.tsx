import { useQuery } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { useTenantData } from './useTenantData.hook';

export const TENANT_ADMIN_DATA_KEY = 'tenant-admin-data';
export const useTenantAdminData = () => {
    const { data } = useTenantData();

    return useQuery<TenantAdminData>(
        [TENANT_ADMIN_DATA_KEY, data.id],
        async () =>
            fetchData({
                url: `${tenantAdminEndpoint}/${data.id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        { staleTime: 60 * 1000 },
    );
};
