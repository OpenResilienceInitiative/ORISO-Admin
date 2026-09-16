import { message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAccountInactivitySettings, updateAccountInactivitySettings } from '../api/tenant/accountInactivitySettings';
import { FETCH_ERRORS } from '../api/fetchData';

export const ACCOUNT_INACTIVITY_SETTINGS_QUERY_KEY = ['account-inactivity-settings'] as const;

const errorKey = (error: unknown) => {
    if (!(error instanceof Error)) return 'globalSettings.accountInactivity.error.generic';
    if (error.message === FETCH_ERRORS.CONFLICT) return 'globalSettings.accountInactivity.error.conflict';
    if (error.message === FETCH_ERRORS.BAD_REQUEST) return 'globalSettings.accountInactivity.error.invalid';
    if (error.message === FETCH_ERRORS.FORBIDDEN) return 'globalSettings.accountInactivity.error.forbidden';
    return 'globalSettings.accountInactivity.error.generic';
};

export const useAccountInactivitySettings = (enabled = true) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ACCOUNT_INACTIVITY_SETTINGS_QUERY_KEY,
        queryFn: getAccountInactivitySettings,
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const mutation = useMutation({
        mutationFn: updateAccountInactivitySettings,
        onSuccess: (confirmed) => {
            queryClient.setQueryData(ACCOUNT_INACTIVITY_SETTINGS_QUERY_KEY, confirmed);
            message.success({ content: t('globalSettings.accountInactivity.saveSuccess'), duration: 3 });
        },
        onError: (error) => {
            message.error({ content: t(errorKey(error)), duration: 5 });
        },
    });
    return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
};
