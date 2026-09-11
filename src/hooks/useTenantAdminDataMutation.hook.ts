import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { mergeTenantAdminData } from '../utils/mergeTenantAdminData';
import { useSingleTenantData, TENANT_QUERY_KEY } from './useSingleTenantData';
import { TENANT_ADMIN_DATA_KEY } from './useTenantAdminData.hook';
import { TENANT_DATA_KEY } from './useTenantData.hook';

interface TenantAdminDataOptions
    extends UseMutationOptions<Partial<TenantAdminData>, unknown, Partial<TenantAdminData>> {
    id: string | number;
    successMessageKey?: string;
    /** Skip GET /service/tenantadmin/{id} and use this payload as the PUT merge base instead. */
    seedTenantAdminData?: TenantAdminData;
    prefetchTenantAdminData?: boolean;
}

export const useTenantAdminDataMutation = ({
    id,
    successMessageKey = 'message.success.setting.update',
    seedTenantAdminData,
    prefetchTenantAdminData = true,
    ...options
}: TenantAdminDataOptions) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const shouldPrefetchTenantAdminData = prefetchTenantAdminData && !!id && id !== 'add' && !seedTenantAdminData;
    const { data: tenantAdminData } = useSingleTenantData({
        id,
        enabled: shouldPrefetchTenantAdminData,
    });

    return useMutation({
        mutationFn: (data: Partial<TenantAdminData>) => {
            const mergeBase = tenantAdminData ?? seedTenantAdminData;

            return fetchData({
                url: `${tenantAdminEndpoint}/${id}`,
                method: FETCH_METHODS.PUT,
                skipAuth: false,
                bodyData: JSON.stringify(mergeTenantAdminData(mergeBase, data)),
                responseHandling: [],
            });
        },
        ...options,
        onSuccess: (responseData, updatedData, onMutateResult, context) => {
            const mergeBase = tenantAdminData ?? seedTenantAdminData;
            const merged = mergeTenantAdminData(mergeBase, updatedData);
            queryClient.setQueryData([TENANT_ADMIN_DATA_KEY], merged);
            if (id != null && id !== '' && id !== 'add') {
                queryClient.setQueryData([TENANT_QUERY_KEY, Number(id)], merged);
            }
            // Appearance cards may seed from /service/tenant — refresh that cache after PUT.
            queryClient.invalidateQueries({ queryKey: [TENANT_DATA_KEY] });
            notification.success({
                message: t(successMessageKey),
                duration: 3,
            });
            options?.onSuccess?.(responseData, updatedData, onMutateResult, context);
        },
        // `responseHandling: []` means fetchData rejects a 5xx without showing anything,
        // so without this the only feedback the user ever gets is the success toast.
        onError: (error, updatedData, onMutateResult, context) => {
            notification.error({
                message: t('message.error.default'),
                duration: 8,
            });
            options?.onError?.(error, updatedData, onMutateResult, context);
        },
    });
};
