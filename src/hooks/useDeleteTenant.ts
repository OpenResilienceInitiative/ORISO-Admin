import { useMutation, UseMutationOptions } from 'react-query';
import { deleteTenantData } from '../api/tenant/deleteTenantData';

export const useDeleteTenant = (options?: UseMutationOptions<void, Error, number>) => {
    return useMutation((id) => deleteTenantData(id), options);
};
