import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AgencyLegalDraft,
    AgencyLegalDraftKind,
    deleteAgencyLegalDraft,
    getAgencyLegalDraft,
    isAgencyLegalDraftConflict,
    putAgencyLegalDraft,
    SaveAgencyLegalDraft,
} from '../../../../api/agency/legalDrafts';

export const agencyLegalDraftKey = (agencyId: number, kind: AgencyLegalDraftKind) =>
    ['agency-legal-draft', agencyId, kind] as const;

interface ContextIdentity {
    key: string;
}

interface ConflictState {
    context: ContextIdentity;
    remote?: AgencyLegalDraft | null;
    refreshFailed: boolean;
}

export const useAgencyLegalDraft = (agencyId: number, kind: AgencyLegalDraftKind, enabled: boolean) => {
    const queryClient = useQueryClient();
    const contextKey = `${agencyId}:${kind}`;
    const contextIdentityRef = useRef<ContextIdentity>({ key: contextKey });
    if (contextIdentityRef.current.key !== contextKey) {
        contextIdentityRef.current = { key: contextKey };
    }
    const contextIdentity = contextIdentityRef.current;
    const [conflictState, setConflictState] = useState<ConflictState>();
    const hasConflict = conflictState?.context === contextIdentity;
    const conflict = hasConflict ? conflictState?.remote : undefined;

    const query = useQuery({
        queryKey: agencyLegalDraftKey(agencyId, kind),
        queryFn: () => getAgencyLegalDraft(agencyId, kind),
        enabled,
        retry: false,
    });

    const readRemoteAfterConflict = useCallback(async () => {
        if (contextIdentityRef.current !== contextIdentity) return undefined;
        setConflictState({ context: contextIdentity, remote: undefined, refreshFailed: false });
        try {
            const remote = await getAgencyLegalDraft(agencyId, kind);
            if (contextIdentityRef.current !== contextIdentity) return undefined;
            setConflictState((previous) =>
                previous?.context === contextIdentity
                    ? { context: contextIdentity, remote, refreshFailed: false }
                    : previous,
            );
            return remote;
        } catch {
            if (contextIdentityRef.current !== contextIdentity) return undefined;
            setConflictState((previous) =>
                previous?.context === contextIdentity
                    ? { context: contextIdentity, remote: undefined, refreshFailed: true }
                    : previous,
            );
            return undefined;
        }
    }, [agencyId, contextIdentity, kind]);

    const save = useCallback(
        async (next: SaveAgencyLegalDraft) => {
            try {
                const saved = await putAgencyLegalDraft(agencyId, kind, next);
                if (contextIdentityRef.current !== contextIdentity) return saved;
                // A read started before this write would land afterwards and put the
                // pre-save revision back in the cache, so the next save conflicts.
                await queryClient.cancelQueries({ queryKey: agencyLegalDraftKey(agencyId, kind) });
                queryClient.setQueryData(agencyLegalDraftKey(agencyId, kind), saved);
                setConflictState((previous) => (previous?.context === contextIdentity ? undefined : previous));
                return saved;
            } catch (error) {
                if (isAgencyLegalDraftConflict(error)) await readRemoteAfterConflict();
                throw error;
            }
        },
        [agencyId, contextIdentity, kind, queryClient, readRemoteAfterConflict],
    );

    const discard = useCallback(
        async (revision: string) => {
            try {
                await deleteAgencyLegalDraft(agencyId, kind, revision);
                if (contextIdentityRef.current !== contextIdentity) return;
                // Same race as in save, except a late read resurrects the deleted draft.
                await queryClient.cancelQueries({ queryKey: agencyLegalDraftKey(agencyId, kind) });
                queryClient.setQueryData(agencyLegalDraftKey(agencyId, kind), null);
                setConflictState((previous) => (previous?.context === contextIdentity ? undefined : previous));
            } catch (error) {
                if (isAgencyLegalDraftConflict(error)) await readRemoteAfterConflict();
                throw error;
            }
        },
        [agencyId, contextIdentity, kind, queryClient, readRemoteAfterConflict],
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
        clearConflict: () =>
            setConflictState((previous) => (previous?.context === contextIdentity ? undefined : previous)),
    };
};
