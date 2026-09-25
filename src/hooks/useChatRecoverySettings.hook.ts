import { message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getChatRecoverySettings, updateChatRecoverySettings } from '../api/tenant/chatRecoverySettings';
import { FETCH_ERRORS } from '../api/fetchData';

export const CHAT_RECOVERY_SETTINGS_QUERY_KEY = ['chat-recovery-settings'] as const;

const errorKey = (error: unknown) => {
    if (!(error instanceof Error)) return 'globalSettings.chatRecovery.error.generic';
    if (error.message === FETCH_ERRORS.CONFLICT) return 'globalSettings.chatRecovery.error.conflict';
    if (error.message === FETCH_ERRORS.BAD_REQUEST) return 'globalSettings.chatRecovery.error.invalid';
    if (error.message === FETCH_ERRORS.FORBIDDEN) return 'globalSettings.chatRecovery.error.forbidden';
    return 'globalSettings.chatRecovery.error.generic';
};

export const useChatRecoverySettings = (enabled = true) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: CHAT_RECOVERY_SETTINGS_QUERY_KEY,
        queryFn: getChatRecoverySettings,
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const mutation = useMutation({
        mutationFn: updateChatRecoverySettings,
        onSuccess: (confirmed) => {
            queryClient.setQueryData(CHAT_RECOVERY_SETTINGS_QUERY_KEY, confirmed);
            message.success({ content: t('globalSettings.chatRecovery.saveSuccess'), duration: 3 });
        },
        onError: (error) => message.error({ content: t(errorKey(error)), duration: 5 }),
    });
    return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
};
