import { useQuery } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { useTenantData } from './useTenantData.hook';

export const TENANT_ADMIN_DATA_KEY = 'tenant-admin-data';
export const useTenantAdminData = () => {
    const { data } = useTenantData();
    const tenantId = data?.id;

    return useQuery<TenantAdminData>({
        queryKey: [TENANT_ADMIN_DATA_KEY, tenantId],
        queryFn: async () =>
            fetchData({
                url: `${tenantAdminEndpoint}/${tenantId}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        enabled: tenantId != null,
        staleTime: 60 * 1000,
    });
};
