import type { JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import logout from '../../api/auth/logout';
import { signDpaAdmin } from '../../api/tenant/signDpaAdmin';
import { Initialization } from '../Layout/Initialization';
import { UserRole } from '../../enums/UserRole';
import { DPA_STATUS_KEY, useDpaStatus } from '../../hooks/useDpaStatus.hook';
import { useDpaVersions } from '../../hooks/useDpaVersions.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { DpaAdminSignRequest } from '../../types/dpa';
import { deriveDpaGateDecision, isDpaGateSubject } from '../../utils/dpaBlockerGate';
import { DpaBlocker, DpaBlockerSignData } from './DpaBlocker';

/**
 * Global route guard for TEN-INV-U10 (#572): wraps the ENTIRE protected admin
 * tree. For tenant-scoped admins it resolves the authoritative DPA status
 * (TenantService U9) before any route content renders:
 *
 * - pending  -> initialization spinner (nothing leaks out),
 * - blocked  -> the non-bypassable {@link DpaBlocker} INSTEAD of the routes —
 *               a direct URL to any admin page hits this same gate,
 * - inactive -> children (status VALID, or the account is not tenant-scoped).
 *
 * Signing writes the returned status back into the query cache, so a
 * successful signature lifts the block immediately and permanently.
 * Frontend-only lock: the backend write enforcement stays U9/U3 scope.
 */
export const DpaBlockerGate = ({ children }: { children: JSX.Element }) => {
    const { hasRole, isSuperAdmin, tenantId } = useUserRoles();
    const queryClient = useQueryClient();

    const isSubject = isDpaGateSubject({
        hasTenantAdminRole: hasRole(UserRole.TenantAdmin),
        hasSingleTenantAdminRole: hasRole(UserRole.SingleTenantAdmin),
        isSuperAdmin,
        tenantId,
    });

    const statusQuery = useDpaStatus(tenantId ?? 0, isSubject);
    const decision = deriveDpaGateDecision({
        isSubject,
        status: statusQuery.data?.status,
        isLoading: statusQuery.isLoading,
        isError: statusQuery.isError,
    });

    const blockedSignable = decision.kind === 'blocked' && decision.signable;
    const versionsQuery = useDpaVersions(tenantId ?? 0, blockedSignable);

    const signMutation = useMutation({
        mutationFn: (body: DpaAdminSignRequest) => signDpaAdmin(tenantId ?? 0, body),
        onSuccess: (statusInfo) => {
            // The sign endpoint answers with the resulting authoritative status
            // (VALID) — write it into the cache so the block lifts right away.
            queryClient.setQueryData([DPA_STATUS_KEY, tenantId], statusInfo);
        },
    });

    if (decision.kind === 'inactive') {
        return children;
    }

    if (decision.kind === 'pending') {
        return <Initialization />;
    }

    const onSign = (data: DpaBlockerSignData) => {
        signMutation.mutate({
            signerName: data.signerName,
            signerPosition: data.signerPosition,
            signerEmail: data.signerEmail,
            signerOrganisation: data.signerOrganisation,
            accepted: data.accepted,
            language: data.language,
        });
    };

    const onRetry = () => {
        signMutation.reset();
        statusQuery.refetch();
        if (blockedSignable) {
            versionsQuery.refetch();
        }
    };

    return (
        <DpaBlocker
            reason={decision.reason}
            signable={decision.signable}
            dpaContent={versionsQuery.data?.[0]?.content ?? null}
            dpaContentLoading={blockedSignable && versionsQuery.isLoading}
            signPending={signMutation.isPending}
            signFailed={signMutation.isError}
            onSign={onSign}
            onRetry={onRetry}
            retryPending={statusQuery.isFetching}
            onLogout={() => logout(true)}
        />
    );
};
