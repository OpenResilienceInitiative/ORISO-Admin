import { message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getTemporaryAccountSettings, updateTemporaryAccountSettings } from '../api/user/temporaryAccountSettings';
import { FETCH_ERRORS } from '../api/fetchData';

export const TEMPORARY_ACCOUNT_SETTINGS_QUERY_KEY = ['temporary-account-settings'] as const;

const errorKey = (error: unknown) => {
    if (!(error instanceof Error)) return 'globalSettings.temporaryAccounts.error.generic';
    if (error.message === FETCH_ERRORS.CONFLICT) return 'globalSettings.temporaryAccounts.error.conflict';
    if (error.message === FETCH_ERRORS.BAD_REQUEST) return 'globalSettings.temporaryAccounts.error.invalid';
    if (error.message === FETCH_ERRORS.FORBIDDEN) return 'globalSettings.temporaryAccounts.error.forbidden';
    return 'globalSettings.temporaryAccounts.error.generic';
};

/** One resource behind both cards; each save sends the whole object with the current revision. */
export const useTemporaryAccountSettings = (enabled = true) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: TEMPORARY_ACCOUNT_SETTINGS_QUERY_KEY,
        queryFn: getTemporaryAccountSettings,
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const mutation = useMutation({
        mutationFn: updateTemporaryAccountSettings,
        onSuccess: (confirmed) => {
            queryClient.setQueryData(TEMPORARY_ACCOUNT_SETTINGS_QUERY_KEY, confirmed);
            message.success({ content: t('globalSettings.temporaryAccounts.saveSuccess'), duration: 3 });
        },
        onError: async (error) => {
            message.error({ content: t(errorKey(error)), duration: 5 });
            if (error instanceof Error && error.message === FETCH_ERRORS.CONFLICT) {
                await queryClient.refetchQueries({ queryKey: TEMPORARY_ACCOUNT_SETTINGS_QUERY_KEY, exact: true });
            }
        },
    });
    return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
};
