import { useEffect, useRef, useState, type JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import logout from '../../api/auth/logout';
import { signDpaAdmin } from '../../api/tenant/signDpaAdmin';
import { createDpaSignInvite, resolveDpaSignLink } from '../../api/tenant/createDpaSignInvite';
import { isDpaInviteEmailDeliveryFailure, sendDpaInviteEmail } from '../../api/tenant/sendDpaInviteEmail';
import { DpaForwardLink, DpaForwardOutcome } from '../../api/tenantOnboarding/dpaForward';
import { Initialization } from '../Layout/Initialization';
import { UserRole } from '../../enums/UserRole';
import { DPA_STATUS_KEY, useDpaStatus } from '../../hooks/useDpaStatus.hook';
import { DPA_VERSIONS_KEY, useDpaVersions } from '../../hooks/useDpaVersions.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { DpaAdminSignRequest, DpaVersion, TenantDpaStatusInfo } from '../../types/dpa';
import { deriveDpaGateDecision, resolveDpaGateSubject } from '../../utils/dpaBlockerGate';
import { DpaBlocker, DpaBlockerSignData } from './DpaBlocker';
import { DpaPendingSignatureDialog } from './DpaPendingSignatureDialog';
import { DpaUnlockDialog } from './DpaUnlockDialog';
import { useDpaOperationScope } from '../../hooks/useDpaOperationScope.hook';
import { parseBackendInstant } from '../../utils/backendInstant';

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
const ScopedDpaBlockerGate = ({
    children,
    scope,
    isCurrent,
}: { children: JSX.Element } & ReturnType<typeof useDpaOperationScope>) => {
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
    /** Link created on this screen, reused by the pending gate instead of spending another slot. */
    const [forwardedLink, setForwardedLink] = useState<{ link: DpaForwardLink; version?: string | null } | null>(null);
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
    const { isCurrent: isPublicationCurrent } = useDpaOperationScope(
        tenantId,
        undefined,
        statusQuery.data?.currentDpaVersion,
    );

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

    useEffect(() => {
        if (decision.kind === 'inactive' || decision.kind === 'unlock-confirm') {
            setForwardedLink(null);
        }
    }, [decision.kind]);

    const blockedSignable = decision.kind === 'blocked' && decision.signable;
    // silent: a versions failure renders the blocker's inline error — never
    // the global toast or the /admin/access-denied redirect (#569 hardening).
    const versionsQuery = useDpaVersions(tenantId ?? 0, blockedSignable, { silent: true });

    const signMutation = useMutation({
        mutationFn: (operation: { tenantId: number; body: DpaAdminSignRequest }) =>
            signDpaAdmin(operation.tenantId, operation.body),
        onSuccess: (statusInfo, operation) => {
            // The sign endpoint answers with the resulting authoritative status
            // (VALID) — write it into the cache so the block lifts right away.
            const current = queryClient.getQueryData<TenantDpaStatusInfo>([DPA_STATUS_KEY, operation.tenantId]);
            const currentDocument = queryClient.getQueryData<DpaVersion[]>([DPA_VERSIONS_KEY, operation.tenantId])?.[0];
            if (
                isCurrent() &&
                statusInfo.tenantId === operation.tenantId &&
                (!current?.currentDpaVersion || current.currentDpaVersion === operation.body.dpaVersion) &&
                (!currentDocument || currentDocument.activationDate === operation.body.dpaVersion)
            ) {
                queryClient.setQueryData([DPA_STATUS_KEY, operation.tenantId], statusInfo);
            }
        },
    });

    // Creating a forwarding link does not soften the gate. The next status
    // read reports `forwardPending`, which renders the dedicated waiting gate
    // until the authorised signer has completed the agreement.
    const mintLink = async (): Promise<DpaForwardLink> => {
        if (!isCurrent() || !isPublicationCurrent()) throw new Error('DPA_VIEW_CHANGED');
        const invite = await createDpaSignInvite(scope.tenantId ?? 0);
        if (!isCurrent() || !isPublicationCurrent()) throw new Error('DPA_VIEW_CHANGED');
        return { signUrl: resolveDpaSignLink(invite.signLink), expiresAt: invite.expiresAt ?? null };
    };

    const forward = async ({ recipientEmail }: { recipientEmail?: string }): Promise<DpaForwardOutcome> => {
        const link = await mintLink();
        if (!isCurrent() || !isPublicationCurrent()) throw new Error('DPA_VIEW_CHANGED');
        if (!recipientEmail) {
            return { link, mailFailed: false };
        }
        try {
            // The authenticated delivery endpoint (UserService #530) carries no
            // recipient name — the salutation falls back to the template default.
            await sendDpaInviteEmail({
                tenantId: scope.tenantId ?? 0,
                recipientEmail,
                signLink: link.signUrl,
                expiresAt: link.expiresAt ?? '',
            });
            return { link, mailFailed: false };
        } catch (error) {
            if (!isDpaInviteEmailDeliveryFailure(error)) {
                throw error;
            }
            return { link, mailFailed: true };
        }
    };

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
            if (!isCurrent()) return;
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
        // No `children`: an unsigned tenant may not reach the admin area at
        // all, so there is nothing behind the dialog to click (JOB7).
        return (
            <DpaPendingSignatureDialog
                key={statusQuery.data?.currentDpaVersion ?? ''}
                ensureSignLink={mintLink}
                initialLink={
                    forwardedLink?.version === statusQuery.data?.currentDpaVersion &&
                    forwardedLink?.link.expiresAt &&
                    parseBackendInstant(forwardedLink.link.expiresAt).getTime() > Date.now()
                        ? forwardedLink.link
                        : undefined
                }
                forward={forward}
                tenantId={tenantId}
                onLogout={() => logout(true)}
                recheckRejected={recheckRejected}
            />
        );
    }

    const displayedVersion = versionsQuery.data?.[0]?.activationDate;
    const signStale =
        signMutation.isError && signMutation.error instanceof Response && signMutation.error.status === 409;
    const onSign = (data: DpaBlockerSignData) => {
        if (!displayedVersion || signStale) return;
        signMutation.mutate({
            tenantId: scope.tenantId ?? 0,
            body: {
                dpaVersion: displayedVersion,
                signerName: data.signerName,
                signerPosition: data.signerPosition,
                signerEmail: data.signerEmail,
                signerOrganisation: data.signerOrganisation,
                accepted: data.accepted,
                language: data.language,
            },
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
            key={`${tenantId}:${displayedVersion ?? ''}`}
            reason={decision.reason}
            signable={decision.signable}
            dpaContent={versionsQuery.data?.[0]?.content ?? null}
            signingDeadlineAt={
                versionsQuery.data?.[0]?.signingDeadlineAt ??
                (statusQuery.data?.currentDpaVersion === displayedVersion
                    ? statusQuery.data?.signingDeadlineAt
                    : undefined)
            }
            dpaContentLoading={blockedSignable && versionsQuery.isLoading}
            signPending={signMutation.isPending}
            signFailed={signMutation.isError}
            signStale={signStale}
            onSign={onSign}
            onForward={blockedSignable ? forward : undefined}
            tenantId={tenantId}
            onForwarded={(result) => {
                if (!isCurrent() || !isPublicationCurrent()) return;
                setForwardedLink({ link: result.link, version: statusQuery.data?.currentDpaVersion });
                statusQuery.refetch();
            }}
            onRetry={onRetry}
            retryPending={statusQuery.isFetching}
            onLogout={() => logout(true)}
        />
    );
};

export const DpaBlockerGate = ({ children }: { children: JSX.Element }) => {
    const { tenantId } = useUserRoles();
    const operationScope = useDpaOperationScope(tenantId);
    return (
        <ScopedDpaBlockerGate key={JSON.stringify(operationScope.scope)} {...operationScope}>
            {children}
        </ScopedDpaBlockerGate>
    );
};
