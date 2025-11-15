import { useMutation, useQueryClient } from 'react-query';
import editTenantData from '../api/tenant/editTenantData';
import { TenantData } from '../types/tenant';
import { TENANT_DATA_KEY } from './useTenantData.hook';

export const useTenantDataUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation(TENANT_DATA_KEY, (data: TenantData) => editTenantData(data), {
        onSuccess: (data) => {
            queryClient.setQueryData(TENANT_DATA_KEY, data);
        },
    });
};
