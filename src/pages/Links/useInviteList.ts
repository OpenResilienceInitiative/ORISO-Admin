import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAccountInvites, type AccountInviteDTO } from '../../api/accountInvites/accountInvites';
import type { InviteViewerScope } from './inviteModel';
import { listedOnTab, type InviteTab } from './inviteRules';

// The complete list, because the board counts client-side; only the newest load writes, as loads walk several pages.
export const useInviteList = (tab: InviteTab, viewer: InviteViewerScope) => {
    const { t } = useTranslation();
    const [invites, setInvites] = useState<AccountInviteDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const loadRevision = useRef(0);

    const reload = useCallback(async () => {
        loadRevision.current += 1;
        const revision = loadRevision.current;
        const isLatest = () => revision === loadRevision.current;
        setLoading(true);
        try {
            const all: AccountInviteDTO[] = [];
            let page = 0;
            let totalPages = 1;
            while (page < totalPages) {
                // The counsellor tab lists every role that joins a unit, so it loads unfiltered.
                // eslint-disable-next-line no-await-in-loop -- totalPages comes from the previous page
                const response = await listAccountInvites({
                    page,
                    size: 200,
                    targetRole: tab === 'tenant' ? 'TENANT_ADMIN' : undefined,
                });
                all.push(...(response.content ?? []).filter((invite) => listedOnTab(invite, tab, viewer)));
                totalPages = response.totalPages ?? 0;
                page += 1;
            }
            if (!isLatest()) return;
            setInvites(all);
        } catch {
            if (!isLatest()) return;
            message.error(t('links.error.loadFailed', 'Could not load links'));
        } finally {
            // A superseded run leaves `loading` to the run that overtook it.
            if (isLatest()) setLoading(false);
        }
    }, [tab, viewer, t]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { invites, setInvites, loading, reload };
};
