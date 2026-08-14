import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { updateDpiaMasterData } from '../api/tenant/updateDpiaMasterData';
import { DpiaMasterData } from '../types/dpiaMasterData';
import { DPIA_MASTER_DATA_KEY } from './useDpiaMasterData.hook';

interface DpiaMasterDataMutationOptions
    extends Omit<UseMutationOptions<DpiaMasterData, unknown, DpiaMasterData>, 'mutationFn'> {
    successMessageKey?: string | false;
}

/** Stores the platform DPIA operator master data and refreshes the cached copy. */
export const useDpiaMasterDataMutation = ({
    // `tenants.message.settingsUpdate` — not the `tenants.message.setting.update` that
    // useTenantAdminControlsMutation defaults to, which has no entry in either locale file
    // and therefore surfaces the raw key to the admin.
    successMessageKey = 'tenants.message.settingsUpdate',
    ...options
}: DpiaMasterDataMutationOptions = {}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateDpiaMasterData,
        ...options,
        onSuccess: (responseData, updatedData, onMutateResult, context) => {
            // Cache the server's response rather than the submitted form values: the backend
            // sanitizes free text and turns blanked-out fields into nulls, so the request body
            // is not what is actually stored.
            queryClient.setQueryData([DPIA_MASTER_DATA_KEY], responseData);
            if (successMessageKey !== false) {
                notification.success({ message: t(successMessageKey), duration: 3 });
            }
            options?.onSuccess?.(responseData, updatedData, onMutateResult, context);
        },
    });
};
