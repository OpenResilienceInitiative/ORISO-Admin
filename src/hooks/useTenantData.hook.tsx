import { useQuery } from 'react-query';
import getPublicTenantData from '../api/tenant/getPublicTenantData';
import getTenantData from '../api/tenant/getTenantData';
import { useAppConfigContext } from '../context/useAppConfig';
import { TenantData } from '../types/tenant';

export const TENANT_DATA_KEY = 'tenant-data';
export const useTenantData = () => {
    const { settings } = useAppConfigContext();

    console.log('🔍 useTenantData: Starting tenant data fetch');
    console.log('🔍 useTenantData: Settings:', settings);

    return useQuery<TenantData>(
        TENANT_DATA_KEY,
        async () => {
            console.log('🔍 useTenantData: Starting async function');

            try {
                console.log('🔍 useTenantData: Calling getPublicTenantData...');
                const tenant = await getPublicTenantData(settings);
                console.log('🔍 useTenantData: getPublicTenantData result:', tenant);

                console.log('🔍 useTenantData: Calling getTenantData...');
                const result = await getTenantData(tenant, settings.multitenancyWithSingleDomainEnabled);
                console.log('🔍 useTenantData: getTenantData result:', result);

                console.log('🔍 useTenantData: SUCCESS - Returning tenant data:', result);
                return result;
            } catch (error) {
                console.error('🔍 useTenantData: ERROR occurred:', error);
                console.log('🔍 useTenantData: Returning fallback data');
                const fallback = { settings: {}, licensing: {} };
                console.log('🔍 useTenantData: Fallback data:', fallback);
                return fallback;
            }
        },
        {
            staleTime: 60_000,
            onSuccess: (data) => {
                console.log('🔍 useTenantData: Query SUCCESS callback:', data);
            },
            onError: (error) => {
                console.error('🔍 useTenantData: Query ERROR callback:', error);
            },
        },
    );
};
