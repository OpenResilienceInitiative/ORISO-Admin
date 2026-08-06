import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getSingleTenantData } from '../api/tenant/getSingleTenantData';
import { TenantAdminData } from '../types/TenantAdminData';

interface TenantsProps extends Omit<UseQueryOptions<TenantAdminData>, 'queryKey' | 'queryFn'> {
    id: string | number;
}

export const TENANT_QUERY_KEY = 'TENANT';
export const useSingleTenantData = ({ id, ...options }: TenantsProps) => {
    return useQuery<TenantAdminData>({
        queryKey: [TENANT_QUERY_KEY, Number(id)],
        queryFn: () => getSingleTenantData(id),
        ...options,
        enabled: id != null && id !== '' && id !== 'add' && (options.enabled ?? true),
    });
};
