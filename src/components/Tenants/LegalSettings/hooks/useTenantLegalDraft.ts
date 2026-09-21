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

/** One editing session of a tenant × kind. A → B → A starts a new one, so late answers from the first A are dropped. */
interface ContextIdentity {
    key: string;
}

interface ConflictState {
    key: ContextIdentity;
    remote?: TenantLegalDraft | null;
    refreshFailed: boolean;
}

export const useTenantLegalDraft = (tenantId: string | number, kind: TenantLegalDraftKind, enabled: boolean) => {
    const queryClient = useQueryClient();
    const contextKey = `${tenantId}:${kind}`;
    const contextIdentityRef = useRef<ContextIdentity>({ key: contextKey });
    if (contextIdentityRef.current.key !== contextKey) contextIdentityRef.current = { key: contextKey };
    const contextIdentity = contextIdentityRef.current;
    const [conflictState, setConflictState] = useState<ConflictState | undefined>();
    const hasConflict = conflictState?.key === contextIdentity;
    const conflict = hasConflict ? conflictState?.remote : undefined;
    if (conflictState && conflictState.key !== contextIdentity) setConflictState(undefined);
    const isCurrent = (identity: ContextIdentity) => contextIdentityRef.current === identity;

    const query = useQuery({
        queryKey: tenantLegalDraftKey(tenantId, kind),
        queryFn: () => getTenantLegalDraft(tenantId, kind),
        enabled,
        retry: false,
    });

    const readRemoteAfterConflict = useCallback(async () => {
        const identity = contextIdentity;
        if (!isCurrent(identity)) return undefined;
        setConflictState((previous) =>
            previous && previous.key !== identity
                ? previous
                : { key: identity, remote: undefined, refreshFailed: false },
        );
        try {
            const remote = await getTenantLegalDraft(tenantId, kind);
            if (!isCurrent(identity)) return undefined;
            setConflictState((previous) =>
                previous?.key === identity ? { key: identity, remote, refreshFailed: false } : previous,
            );
            return remote;
        } catch {
            setConflictState((previous) =>
                previous?.key === identity ? { key: identity, remote: undefined, refreshFailed: true } : previous,
            );
            return undefined;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- identity is read from the ref on purpose
    }, [contextIdentity, kind, tenantId]);

    const save = useCallback(
        async (next: SaveTenantLegalDraft) => {
            const identity = contextIdentity;
            try {
                const saved = await putTenantLegalDraft(tenantId, kind, next);
                if (isCurrent(identity)) {
                    // A read still in flight must not land after this write and restore the old revision.
                    await queryClient.cancelQueries({ queryKey: tenantLegalDraftKey(tenantId, kind) });
                    queryClient.setQueryData(tenantLegalDraftKey(tenantId, kind), saved);
                    setConflictState((previous) => (previous?.key === identity ? undefined : previous));
                }
                return saved;
            } catch (error) {
                if (isTenantLegalDraftConflict(error)) await readRemoteAfterConflict();
                throw error;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- identity is read from the ref on purpose
        [contextIdentity, kind, queryClient, readRemoteAfterConflict, tenantId],
    );

    const discard = useCallback(
        async (revision: string) => {
            const identity = contextIdentity;
            try {
                await deleteTenantLegalDraft(tenantId, kind, revision);
                if (isCurrent(identity)) {
                    await queryClient.cancelQueries({ queryKey: tenantLegalDraftKey(tenantId, kind) });
                    queryClient.setQueryData(tenantLegalDraftKey(tenantId, kind), null);
                    setConflictState((previous) => (previous?.key === identity ? undefined : previous));
                }
            } catch (error) {
                if (isTenantLegalDraftConflict(error)) await readRemoteAfterConflict();
                throw error;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- identity is read from the ref on purpose
        [contextIdentity, kind, queryClient, readRemoteAfterConflict, tenantId],
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
        clearConflict: () => setConflictState((previous) => (previous?.key === contextIdentity ? undefined : previous)),
    };
};
