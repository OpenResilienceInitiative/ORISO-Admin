import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishDpa } from '../api/tenant/publishDpa';
import { DPA_VERSIONS_KEY } from './useDpaVersions.hook';
import { DPA_GATE_KEY } from './useDpaGate.hook';
import { DPA_STATUS_KEY } from './useDpaStatus.hook';
import { useDpaOperationScope } from './useDpaOperationScope.hook';

/** Publish a dated version; the card owns errors so failed drafts remain editable. */
export const usePublishDpa = (tenantId: number) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { scope, isCurrent } = useDpaOperationScope(tenantId);
    return useMutation({
        // Changing views detaches the observer; the pending operation retains its owner.
        mutationKey: ['publish-dpa', scope],
        mutationFn: ({
            contentByLanguage,
            signingDeadlineAt,
        }: {
            contentByLanguage: Record<string, string>;
            signingDeadlineAt: string;
        }) => publishDpa(tenantId, contentByLanguage, signingDeadlineAt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [DPA_VERSIONS_KEY, tenantId] });
            queryClient.invalidateQueries({ queryKey: [DPA_GATE_KEY, tenantId] });
            queryClient.invalidateQueries({ queryKey: [DPA_STATUS_KEY, tenantId] });
            if (!isCurrent()) return;
            notification.success({
                message: t('tenants.legal.version.publishSuccess'),
                duration: 4,
            });
        },
    });
};
