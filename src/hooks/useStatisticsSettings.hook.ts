import { message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getStatisticsSettings, updateStatisticsSettings } from '../api/statistic/statisticsSettings';
import { FETCH_ERRORS } from '../api/fetchData';

export const STATISTICS_SETTINGS_QUERY_KEY = ['statistics-settings'] as const;

const errorKey = (error: unknown) => {
    if (!(error instanceof Error)) return 'globalSettings.statistics.error.generic';
    if (error.message === FETCH_ERRORS.CONFLICT) return 'globalSettings.statistics.error.conflict';
    if (error.message === FETCH_ERRORS.BAD_REQUEST) return 'globalSettings.statistics.error.invalid';
    if (error.message === FETCH_ERRORS.FORBIDDEN) return 'globalSettings.statistics.error.forbidden';
    return 'globalSettings.statistics.error.generic';
};

export const useStatisticsSettings = (enabled = true) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: STATISTICS_SETTINGS_QUERY_KEY,
        queryFn: getStatisticsSettings,
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const mutation = useMutation({
        mutationFn: updateStatisticsSettings,
        onSuccess: (confirmed) => {
            queryClient.setQueryData(STATISTICS_SETTINGS_QUERY_KEY, confirmed);
            message.success({ content: t('globalSettings.statistics.saveSuccess'), duration: 3 });
        },
        onError: (error) => message.error({ content: t(errorKey(error)), duration: 5 }),
    });
    return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
};
