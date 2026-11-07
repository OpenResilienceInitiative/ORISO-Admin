import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listLiveChatLinkTopics } from '../api/invitelinks/topicInviteLinks';
import { useTenantTopics } from './useTenantTopics';

export const useLiveChatLinkTopics = (tenantId?: number) => {
    const { i18n } = useTranslation();
    const defaultTopics = useTenantTopics(true, tenantId == null);
    const scopedTopics = useQuery({
        queryKey: ['LIVE_CHAT_LINK_TOPICS', tenantId, i18n.resolvedLanguage || i18n.language],
        queryFn: tenantId == null ? skipToken : ({ signal }) => listLiveChatLinkTopics(tenantId, signal),
        retry: false,
    });

    return tenantId == null ? defaultTopics : scopedTopics;
};
