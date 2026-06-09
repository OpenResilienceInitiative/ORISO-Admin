import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, UseMutationOptions } from 'react-query';
import { apiServerSettings } from '../api/settings/apiServerSettings';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { serverSettingsAdminEndpoint } from '../appConfig';
import { useAppConfigContext } from '../context/useAppConfig';

export const useSettingsAdminMutation = (options?: UseMutationOptions<Partial<unknown>, unknown, Partial<unknown>>) => {
    const { t } = useTranslation();
    const { settings, setManualSettings, setServerSettings } = useAppConfigContext();

    return useMutation(
        (data) => {
            return fetchData({
                url: serverSettingsAdminEndpoint,
                method: FETCH_METHODS.PATCH,
                skipAuth: false,
                bodyData: JSON.stringify({
                    legalContentChangesBySingleTenantAdminsAllowed:
                        settings.legalContentChangesBySingleTenantAdminsAllowed,
                    mainTenantSubdomainForSingleDomainMultitenancy:
                        settings.mainTenantSubdomainForSingleDomainMultitenancy,
                    ...data,
                }),
                responseHandling: [],
            });
        },
        {
            ...options,
            onSuccess: (responseData, updatedData) => {
                setManualSettings({
                    legalContentChangesBySingleTenantAdminsAllowed:
                        settings.legalContentChangesBySingleTenantAdminsAllowed,
                    mainTenantSubdomainForSingleDomainMultitenancy:
                        settings.mainTenantSubdomainForSingleDomainMultitenancy,
                    ...updatedData,
                });
                apiServerSettings().then(setServerSettings);
                message.success({
                    content: t('message.success.setting.update'),
                    duration: 3,
                });
                options?.onSuccess?.(responseData, updatedData, null);
            },
        },
    );
};
