import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    listAccountInvites,
    type AccountInviteDTO,
    type InviteProgressPhase,
} from '../../api/accountInvites/accountInvites';
import type { DataTableSort } from '../../components/DataTable';
import type { InviteViewerScope } from './inviteModel';
import { listedOnTab, type InviteTab } from './inviteRules';
import { tileCountsFromServer, type LifecycleCounts, type LifecyclePhase } from './inviteProgress/derivePhases';

export interface InviteListQuery {
    query: string;
    /** UI pages are one-based; the API is zero-based. */
    page: number;
    pageSize: number;
    phase: LifecyclePhase | null;
    sort: DataTableSort | null;
}

export const INITIAL_INVITE_QUERY: InviteListQuery = { query: '', page: 1, pageSize: 20, phase: null, sort: null };

const PHASES: Record<LifecyclePhase, InviteProgressPhase[]> = {
    prepared: ['PREPARED'],
    invited: ['INVITED'],
    accountCreated: ['ACCOUNT_CREATED'],
    done: ['DONE'],
    needsAction: ['NEEDS_ACTION', 'CLOSED'],
};

/** One server-filtered page; superseded requests cannot replace newer results or counts. */
export const useInviteList = (
    tab: InviteTab,
    viewer: InviteViewerScope,
    request: InviteListQuery = INITIAL_INVITE_QUERY,
) => {
    const { t } = useTranslation();
    const [invites, setInvites] = useState<AccountInviteDTO[]>([]);
    const [tileCounts, setTileCounts] = useState<LifecycleCounts | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const loadRevision = useRef(0);
    const { page, pageSize, query, phase } = request;
    const sortKey = request.sort?.key;
    const sortDirection = request.sort?.direction;

    const reload = useCallback(async () => {
        loadRevision.current += 1;
        const revision = loadRevision.current;
        const isLatest = () => revision === loadRevision.current;
        setLoading(true);
        setError(false);
        try {
            const response = await listAccountInvites({
                page: Math.max(0, page - 1),
                size: pageSize,
                tab: tab === 'tenant' ? 'TENANT' : 'UNIT',
                targetRole: viewer === 'agency' ? 'COUNSELLOR' : undefined,
                query: query.trim() || undefined,
                progressPhases: phase ? PHASES[phase] : undefined,
                sort: sortKey === 'recipient' || sortKey === 'invitedAt' ? sortKey : undefined,
                sortDirection,
            });
            if (!isLatest()) return;
            setInvites((response.content ?? []).filter((invite) => listedOnTab(invite, tab, viewer)));
            setTotalElements(response.totalElements ?? response.content?.length ?? 0);
            setTileCounts(tileCountsFromServer(response.phaseCounts, response.phaseDetailCounts));
        } catch {
            if (!isLatest()) return;
            setInvites([]);
            setTotalElements(0);
            setTileCounts(undefined);
            setError(true);
            message.error(t('links.error.loadFailed', 'Could not load links'));
        } finally {
            // A superseded run leaves `loading` to the run that overtook it.
            if (isLatest()) setLoading(false);
        }
    }, [tab, viewer, t, page, pageSize, query, phase, sortKey, sortDirection]);

    useEffect(() => {
        reload();
        return () => {
            loadRevision.current += 1;
        };
    }, [reload]);

    return { invites, setInvites, tileCounts, totalElements, loading, error, reload };
};
