import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listLiveChatLinkTopics } from '../api/invitelinks/topicInviteLinks';
import { useTenantTopics } from './useTenantTopics';

export const useLiveChatLinkTopics = (tenantId?: number) => {
    const { i18n } = useTranslation();
    // `inviteLinkHeaders` treats a non-positive tenant ID as "no override" and sends the signed-in tenant,
    // so the topics must follow the same contract instead of loading another tenant's topics under ID 0.
    const scoped = tenantId != null && tenantId > 0;
    const defaultTopics = useTenantTopics(true, !scoped);
    const scopedTopics = useQuery({
        queryKey: ['LIVE_CHAT_LINK_TOPICS', tenantId, i18n.resolvedLanguage || i18n.language],
        queryFn: scoped ? ({ signal }) => listLiveChatLinkTopics(tenantId, signal) : skipToken,
        retry: false,
    });

    return scoped ? scopedTopics : defaultTopics;
};
