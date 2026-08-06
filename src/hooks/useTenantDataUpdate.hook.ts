import { useMutation, useQueryClient } from '@tanstack/react-query';
import editTenantData from '../api/tenant/editTenantData';
import { TenantData } from '../types/tenant';
import { TENANT_DATA_KEY } from './useTenantData.hook';

export const useTenantDataUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: [TENANT_DATA_KEY],
        mutationFn: (data: TenantData) => editTenantData(data),
        onSuccess: (data) => {
            queryClient.setQueryData([TENANT_DATA_KEY], data);
        },
    });
};
