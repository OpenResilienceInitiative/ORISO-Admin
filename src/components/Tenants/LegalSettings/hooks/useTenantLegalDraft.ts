import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    deleteTenantLegalDraft,
    getTenantLegalDraft,
    isTenantLegalDraftConflict,
    putTenantLegalDraft,
    SaveTenantLegalDraft,
    TenantLegalDraft,
    TenantLegalDraftKind,
} from '../../../../api/tenant/legalDrafts';

export const tenantLegalDraftKey = (tenantId: string | number, kind: TenantLegalDraftKind) =>
    ['tenant-legal-draft', String(tenantId), kind] as const;

interface ConflictState {
    key: string;
    remote?: TenantLegalDraft | null;
    refreshFailed: boolean;
}

export const useTenantLegalDraft = (tenantId: string | number, kind: TenantLegalDraftKind, enabled: boolean) => {
    const queryClient = useQueryClient();
    const contextKey = `${tenantId}:${kind}`;
    const contextKeyRef = useRef(contextKey);
    contextKeyRef.current = contextKey;
    const [conflictState, setConflictState] = useState<ConflictState | undefined>();
    const hasConflict = conflictState?.key === contextKey;
    const conflict = hasConflict ? conflictState?.remote : undefined;
    if (conflictState && conflictState.key !== contextKey) setConflictState(undefined);

    const query = useQuery({
        queryKey: tenantLegalDraftKey(tenantId, kind),
        queryFn: () => getTenantLegalDraft(tenantId, kind),
        enabled,
        retry: false,
    });

    const readRemoteAfterConflict = useCallback(async () => {
        if (contextKeyRef.current !== contextKey) return undefined;
        setConflictState((previous) =>
            previous && previous.key !== contextKey
                ? previous
                : { key: contextKey, remote: undefined, refreshFailed: false },
        );
        try {
            const remote = await getTenantLegalDraft(tenantId, kind);
            if (contextKeyRef.current !== contextKey) return undefined;
            setConflictState((previous) =>
                previous?.key === contextKey ? { key: contextKey, remote, refreshFailed: false } : previous,
            );
            return remote;
        } catch {
            setConflictState((previous) =>
                previous?.key === contextKey ? { key: contextKey, remote: undefined, refreshFailed: true } : previous,
            );
            return undefined;
        }
    }, [contextKey, kind, tenantId]);

    const save = useCallback(
        async (next: SaveTenantLegalDraft) => {
            try {
                const saved = await putTenantLegalDraft(tenantId, kind, next);
                queryClient.setQueryData(tenantLegalDraftKey(tenantId, kind), saved);
                setConflictState((previous) => (previous?.key === contextKey ? undefined : previous));
                return saved;
            } catch (error) {
                if (isTenantLegalDraftConflict(error)) await readRemoteAfterConflict();
                throw error;
            }
        },
        [contextKey, kind, queryClient, readRemoteAfterConflict, tenantId],
    );

    const discard = useCallback(
        async (revision: string) => {
            try {
                await deleteTenantLegalDraft(tenantId, kind, revision);
                queryClient.setQueryData(tenantLegalDraftKey(tenantId, kind), null);
                setConflictState((previous) => (previous?.key === contextKey ? undefined : previous));
            } catch (error) {
                if (isTenantLegalDraftConflict(error)) await readRemoteAfterConflict();
                throw error;
            }
        },
        [contextKey, kind, queryClient, readRemoteAfterConflict, tenantId],
    );

    return {
        draft: query.data,
        isLoading: enabled && query.isLoading,
        isError: enabled && query.isError,
        retry: query.refetch,
        save,
        discard,
        hasConflict,
        conflict,
        conflictRefreshFailed: hasConflict && !!conflictState?.refreshFailed,
        conflictRefreshing: hasConflict && !conflictState?.refreshFailed && conflictState?.remote === undefined,
        retryConflict: readRemoteAfterConflict,
        clearConflict: () => setConflictState((previous) => (previous?.key === contextKey ? undefined : previous)),
    };
};
