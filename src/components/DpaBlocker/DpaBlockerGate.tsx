import { useState, type JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import logout from '../../api/auth/logout';
import { signDpaAdmin } from '../../api/tenant/signDpaAdmin';
import { createDpaSignInvite, resolveDpaSignLink } from '../../api/tenant/createDpaSignInvite';
import { sendDpaInviteEmail } from '../../api/tenant/sendDpaInviteEmail';
import { isDpaForwardExpired } from '../../api/tenantOnboarding/dpaForward';
import { Initialization } from '../Layout/Initialization';
import { UserRole } from '../../enums/UserRole';
import { DPA_STATUS_KEY, useDpaStatus } from '../../hooks/useDpaStatus.hook';
import { DPA_ACTIVE_FORWARD_KEY, useDpaActiveForward } from '../../hooks/useDpaActiveForward.hook';
import { useDpaVersions } from '../../hooks/useDpaVersions.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { DpaAdminSignRequest } from '../../types/dpa';
import { deriveDpaGateDecision, resolveDpaGateSubject } from '../../utils/dpaBlockerGate';
import { DpaBlocker, DpaBlockerSignData } from './DpaBlocker';
import { DpaPendingSignatureDialog } from './DpaPendingSignatureDialog';

/**
 * Global route guard for TEN-INV-U10 (#572): wraps the ENTIRE protected admin
 * tree. For tenant-scoped admins it resolves the authoritative DPA status
 * (TenantService U9) before any route content renders:
 *
 * - pending  -> initialization spinner (nothing leaks out),
 * - blocked  -> the non-bypassable {@link DpaBlocker} INSTEAD of the routes —
 *               a direct URL to any admin page hits this same gate,
 * - inactive -> children (status VALID, or the account is not tenant-scoped),
 * - forwarded-pending (#724) -> children PLUS the friendly recurring
 *               {@link DpaPendingSignatureDialog}: the signature was
 *               explicitly handed to an authorised signatory, so the admin
 *               may work on non-legal data while the tenant legitimately
 *               waits. Softening requires POSITIVE proof of the delegation —
 *               a failed forward lookup keeps the hard blocker (fail-closed),
 *               and the never-forwarded unsigned state is unchanged (#572).
 *
 * Signing writes the returned status back into the query cache, so a
 * successful signature lifts the block immediately and permanently.
 * Frontend-only lock: the backend write enforcement stays U9/U3 scope.
 */
export const DpaBlockerGate = ({ children }: { children: JSX.Element }) => {
    const { hasRole, isSuperAdmin, tenantId, tokenUnreadable } = useUserRoles();
    const queryClient = useQueryClient();
    // Dismissal is per app load: a fresh login (page load) shows the dialog
    // again, while SPA navigation within the session stays quiet (#724).
    const [pendingDismissed, setPendingDismissed] = useState(false);

    // FAIL-CLOSED (#569 hardening): 'indeterminate' (malformed token /
    // tenant-admin without a usable tenantId claim) blocks instead of
    // granting full access.
    const subjectKind = resolveDpaGateSubject({
        hasTenantAdminRole: hasRole(UserRole.TenantAdmin),
        hasSingleTenantAdminRole: hasRole(UserRole.SingleTenantAdmin),
        isSuperAdmin,
        tenantId,
        tokenUnreadable,
    });

    const statusQuery = useDpaStatus(tenantId ?? 0, subjectKind === 'subject');

    // Whether the status alone would block-but-signable — only then is the
    // forward lookup relevant (#724). Derived WITHOUT forward input first so
    // the query enablement cannot depend on its own result.
    const statusOnlyDecision = deriveDpaGateDecision({
        subjectKind,
        status: statusQuery.data?.status,
        isLoading: statusQuery.isLoading,
        isError: statusQuery.isError,
    });
    const forwardRelevant = statusOnlyDecision.kind === 'blocked' && statusOnlyDecision.signable;
    const forwardQuery = useDpaActiveForward(tenantId ?? 0, subjectKind === 'subject' && forwardRelevant);

    const decision = deriveDpaGateDecision({
        subjectKind,
        status: statusQuery.data?.status,
        isLoading: statusQuery.isLoading,
        isError: statusQuery.isError,
        // A failed lookup means "delegation unproven" -> hard blocker.
        forward: forwardQuery.isError ? null : forwardQuery.data,
        forwardLoading: forwardRelevant && forwardQuery.isLoading,
    });

    const blockedSignable = decision.kind === 'blocked' && decision.signable;
    // silent: a versions failure renders the blocker's inline error — never
    // the global toast or the /admin/access-denied redirect (#569 hardening).
    const versionsQuery = useDpaVersions(tenantId ?? 0, blockedSignable, { silent: true });

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

    if (decision.kind === 'forwarded-pending') {
        const { forward } = decision;
        // The active link when still valid; a fresh invite through the
        // declaration path when it expired (#724).
        const ensureSignLink = async () => {
            if (!isDpaForwardExpired(forward)) {
                return { signLink: forward.signLink, expiresAt: forward.expiresAt };
            }
            const invite = await createDpaSignInvite(tenantId ?? 0);
            return { signLink: resolveDpaSignLink(invite.signLink), expiresAt: invite.expiresAt as string | null };
        };
        return (
            <>
                {children}
                {!pendingDismissed && (
                    <DpaPendingSignatureDialog
                        forward={forward}
                        ensureSignLink={ensureSignLink}
                        sendEmail={({ recipientEmail, link }) =>
                            // The authenticated delivery endpoint (UserService #530)
                            // carries no recipient name — the salutation falls back
                            // to the template default.
                            sendDpaInviteEmail({
                                tenantId: tenantId ?? 0,
                                recipientEmail,
                                signLink: link.signLink,
                                expiresAt: link.expiresAt ?? '',
                            }).then(() => undefined)
                        }
                        onDismiss={() => setPendingDismissed(true)}
                        onForwardCompleted={({ link, recipientEmail }) => {
                            // Keep the cached forward current (fresh link and/or
                            // recipient) and let the admin proceed.
                            queryClient.setQueryData([DPA_ACTIVE_FORWARD_KEY, tenantId], {
                                signLink: link.signLink,
                                expiresAt: link.expiresAt,
                                recipientEmail: recipientEmail ?? forward.recipientEmail ?? null,
                            });
                            setPendingDismissed(true);
                        }}
                    />
                )}
            </>
        );
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
        if (forwardRelevant) {
            forwardQuery.refetch();
        }
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
