import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAccountInvites, type AccountInviteDTO } from '../../api/accountInvites/accountInvites';
import type { InviteViewerScope } from './inviteModel';
import { listedOnTab, type InviteTab } from './inviteRules';
import { tileCountsFromServer, type LifecycleCounts } from './inviteProgress/derivePhases';

// The complete list, because the table searches and sorts client-side; only the newest load writes, as loads walk several pages.
export const useInviteList = (tab: InviteTab, viewer: InviteViewerScope) => {
    const { t } = useTranslation();
    const [invites, setInvites] = useState<AccountInviteDTO[]>([]);
    const [tileCounts, setTileCounts] = useState<LifecycleCounts | undefined>();
    const [loading, setLoading] = useState(false);
    const loadRevision = useRef(0);

    const reload = useCallback(async () => {
        loadRevision.current += 1;
        const revision = loadRevision.current;
        const isLatest = () => revision === loadRevision.current;
        setLoading(true);
        try {
            const all: AccountInviteDTO[] = [];
            let counts: LifecycleCounts | undefined;
            let page = 0;
            let totalPages = 1;
            while (page < totalPages) {
                // eslint-disable-next-line no-await-in-loop -- totalPages comes from the previous page
                const response = await listAccountInvites({
                    page,
                    size: 200,
                    tab: tab === 'tenant' ? 'TENANT' : 'UNIT',
                });
                all.push(...(response.content ?? []).filter((invite) => listedOnTab(invite, tab, viewer)));
                // Every page carries the same totals over the whole tab.
                counts ??= tileCountsFromServer(response.phaseCounts, response.phaseDetailCounts);
                totalPages = response.totalPages ?? 0;
                page += 1;
            }
            if (!isLatest()) return;
            setInvites(all);
            setTileCounts(counts);
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

    return { invites, setInvites, tileCounts, loading, reload };
};
