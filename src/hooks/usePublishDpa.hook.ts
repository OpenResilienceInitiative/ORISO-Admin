import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishDpa } from '../api/tenant/publishDpa';
import { DPA_VERSIONS_KEY } from './useDpaVersions.hook';

/**
 * Publishes the tenant DPA, refreshes the version list on success, and gives the
 * admin explicit feedback either way: publishing a legal document without
 * confirmation is a real hazard, so success shows a confirmation and failure an
 * error toast that names the DPA context (on top of fetchData's generic toast).
 */
export const usePublishDpa = (tenantId: number) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (contentByLanguage: Record<string, string>) => publishDpa(tenantId, contentByLanguage),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [DPA_VERSIONS_KEY, tenantId] });
            notification.success({
                message: t('tenants.legal.version.publishSuccess'),
                duration: 4,
            });
        },
        onError: () => {
            notification.error({
                message: t('tenants.legal.version.publishError'),
                duration: 8,
            });
        },
    });
};
