import { useQuery } from 'react-query';
import getPublicTenantData from '../api/tenant/getPublicTenantData';
import { useAppConfigContext } from '../context/useAppConfig';

export const PUBLIC_TENANT_DATA_KEY = 'public-tenant-data';
export const usePublicTenantData = () => {
    const { settings } = useAppConfigContext();
    return useQuery(PUBLIC_TENANT_DATA_KEY, () => getPublicTenantData(settings));
};
