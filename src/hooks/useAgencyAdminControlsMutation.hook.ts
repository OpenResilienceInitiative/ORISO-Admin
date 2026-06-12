import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, UseMutationOptions } from 'react-query';
import { updateAgencyAdminControls } from '../api/agency/updateAgencyAdminControls';
import { AgencyAdminControls } from '../types/AgencyAdminControls';
import { AGENCY_ADMIN_CONTROLS_KEY } from './useAgencyAdminControls.hook';

interface AgencyAdminControlsMutationOptions
    extends UseMutationOptions<AgencyAdminControls, unknown, Partial<AgencyAdminControls>> {
    successMessageKey?: string | false;
}

export const useAgencyAdminControlsMutation = ({
    successMessageKey = 'tenants.message.settingsUpdate',
    ...options
}: AgencyAdminControlsMutationOptions = {}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation(updateAgencyAdminControls, {
        ...options,
        onSuccess: (responseData, updatedData) => {
            queryClient.setQueryData([AGENCY_ADMIN_CONTROLS_KEY], responseData);
            if (successMessageKey !== false) {
                notification.success({
                    message: t(successMessageKey),
                    duration: 3,
                });
            }
            options?.onSuccess?.(responseData, updatedData, null);
        },
    });
};
