import { useQuery, UseQueryOptions } from 'react-query';
import { getSingleTenantData } from '../api/tenant/getSingleTenantData';
import { TenantAdminData } from '../types/TenantAdminData';

interface TenantsProps extends UseQueryOptions<TenantAdminData> {
    id: string | number;
}

export const TENANT_QUERY_KEY = 'TENANT';
export const useSingleTenantData = ({ id, ...options }: TenantsProps) => {
    return useQuery<TenantAdminData>([TENANT_QUERY_KEY, Number(id)], () => getSingleTenantData(id), {
        ...options,
        enabled: (id && id !== 'add') || options.enabled,
    });
};
