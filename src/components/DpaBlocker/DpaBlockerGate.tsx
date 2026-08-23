import { useEffect, useRef, useState, type JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import logout from '../../api/auth/logout';
import { signDpaAdmin } from '../../api/tenant/signDpaAdmin';
import { createDpaSignInvite, resolveDpaSignLink } from '../../api/tenant/createDpaSignInvite';
import { sendDpaInviteEmail } from '../../api/tenant/sendDpaInviteEmail';
import { DpaForwardLink, DpaForwardOutcome } from '../../api/tenantOnboarding/dpaForward';
import { Initialization } from '../Layout/Initialization';
import { UserRole } from '../../enums/UserRole';
import { DPA_STATUS_KEY, useDpaStatus } from '../../hooks/useDpaStatus.hook';
import { useDpaVersions } from '../../hooks/useDpaVersions.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { DpaAdminSignRequest } from '../../types/dpa';
import { deriveDpaGateDecision, resolveDpaGateSubject } from '../../utils/dpaBlockerGate';
import { DpaBlocker, DpaBlockerSignData } from './DpaBlocker';
import { DpaPendingSignatureDialog } from './DpaPendingSignatureDialog';
import { DpaUnlockDialog } from './DpaUnlockDialog';

/**
 * Global route guard for TEN-INV-U10 (#572): wraps the ENTIRE protected admin
 * tree. For tenant-scoped admins it resolves the authoritative DPA status
 * (TenantService U9) before any route content renders:
 *
 * - pending  -> initialization spinner (nothing leaks out),
 * - blocked  -> the non-bypassable {@link DpaBlocker} INSTEAD of the routes —
 *               a direct URL to any admin page hits this same gate,
 * - inactive -> children (status VALID, or the account is not tenant-scoped),
 * - forwarded-pending (#724, hardened by JOB7) -> the
 *               {@link DpaPendingSignatureDialog} INSTEAD of the routes. The
 *               signature was handed to an authorised signatory, so the tenant
 *               gets the calm waiting screen with the sign link rather than
 *               the sign form — but it is still a GATE: the admin area is not
 *               rendered behind it and the only exit is logout. The trigger is
 *               the additive `forwardPending` flag on the status DTO (#723
 *               contract correction — the `status` enum itself has no
 *               `PENDING_FORWARDED` value); absent or false it keeps the
 *               strict #572 blocker,
 * - unlock-confirm (JOB8/JOB9) -> the signature landed WHILE the tenant was
 *               waiting. {@link DpaUnlockDialog} asks for one explicit click,
 *               and that click re-asks the backend before the app opens.
 *
 * Signing writes the returned status back into the query cache, so a
 * successful signature lifts the block immediately and permanently.
 * Frontend-only lock: the backend write enforcement stays U9/U3 scope.
 *
 * The gate only ever READS signature state (ADR-022): the status GET, and the
 * sign endpoint the admin themselves submits. Nothing here fabricates a
 * consent or signature record.
 */
export const DpaBlockerGate = ({ children }: { children: JSX.Element }) => {
    const { hasRole, isSuperAdmin, tenantId, tokenUnreadable } = useUserRoles();
    const queryClient = useQueryClient();
    /**
     * The waiting dialog has been on screen in this session, so a VALID status
     * arriving now is a transition the tenant has not acknowledged yet. A ref,
     * not state: it only ever feeds the NEXT decision.
     */
    const awaitedForwardedSignature = useRef(false);
    /** The re-check confirmed the signature — the app may render. */
    const [platformUnlocked, setPlatformUnlocked] = useState(false);
    const [recheckPending, setRecheckPending] = useState(false);
    /** The re-check came back without a signature — explained on the gate. */
    const [recheckRejected, setRecheckRejected] = useState(false);

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

    const decision = deriveDpaGateDecision({
        subjectKind,
        status: statusQuery.data?.status,
        isLoading: statusQuery.isLoading,
        isError: statusQuery.isError,
        // Rides on the same status answer — no second request to wait for.
        forwardPending: statusQuery.data?.forwardPending,
        wasAwaitingForwardedSignature: awaitedForwardedSignature.current && !platformUnlocked,
    });

    useEffect(() => {
        if (decision.kind === 'forwarded-pending') {
            awaitedForwardedSignature.current = true;
            // Re-gated after an unlock (e.g. a new DPA version): the next
            // signature has to be acknowledged again.
            setPlatformUnlocked(false);
        }
    }, [decision.kind]);

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

    if (decision.kind === 'unlock-confirm') {
        /**
         * JOB9 — the acceptance criterion for JOB8's button lives HERE: the
         * click does not trust `statusQuery.data`, it forces a fresh request
         * and reads THAT answer.
         *
         * - VALID   -> the gate opens.
         * - anything else -> the tenant stays gated; the waiting dialog comes
         *   back carrying the reason.
         * - request failed -> `isError` puts the decision back on the
         *   fail-closed STATUS_UNAVAILABLE blocker with its own retry.
         */
        const onUnlockPlatform = async () => {
            setRecheckPending(true);
            setRecheckRejected(false);
            const verified = await statusQuery.refetch();
            setRecheckPending(false);
            if (verified.isError || verified.data?.status !== 'VALID') {
                setRecheckRejected(!verified.isError);
                return;
            }
            setPlatformUnlocked(true);
        };

        return (
            <DpaUnlockDialog
                onUnlock={onUnlockPlatform}
                onLogout={() => logout(true)}
                checking={recheckPending || statusQuery.isFetching}
            />
        );
    }

    if (decision.kind === 'forwarded-pending') {
        // Post-login there is no "read the active link" endpoint: issuing a
        // fresh one is the supported way, and every issued link stays valid
        // until a signature lands (#723 contract).
        const mintLink = async (): Promise<DpaForwardLink> => {
            const invite = await createDpaSignInvite(tenantId ?? 0);
            return { signUrl: resolveDpaSignLink(invite.signLink), expiresAt: invite.expiresAt ?? null };
        };
        const forward = async ({ recipientEmail }: { recipientEmail?: string }): Promise<DpaForwardOutcome> => {
            const link = await mintLink();
            if (!recipientEmail) {
                return { link, mailFailed: false };
            }
            try {
                // The authenticated delivery endpoint (UserService #530)
                // carries no recipient name — the salutation falls back to the
                // template default.
                await sendDpaInviteEmail({
                    tenantId: tenantId ?? 0,
                    recipientEmail,
                    signLink: link.signUrl,
                    expiresAt: link.expiresAt ?? '',
                });
                return { link, mailFailed: false };
            } catch {
                // Same shape as the public 502: the link exists, only the mail
                // did not go out — never present that as a total failure.
                return { link, mailFailed: true };
            }
        };
        // No `children`: an unsigned tenant may not reach the admin area at
        // all, so there is nothing behind the dialog to click (JOB7).
        return (
            <DpaPendingSignatureDialog
                ensureSignLink={mintLink}
                forward={forward}
                onLogout={() => logout(true)}
                recheckRejected={recheckRejected}
            />
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
