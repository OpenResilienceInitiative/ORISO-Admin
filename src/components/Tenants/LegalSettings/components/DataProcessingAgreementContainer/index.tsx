import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Space, Spin } from 'antd';
import Check from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { useDpaVersions } from '../../../../../hooks/useDpaVersions.hook';
import { usePublishDpa } from '../../../../../hooks/usePublishDpa.hook';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { useUserData } from '../../../../../hooks/useUserData.hook';
import { DpaSignInvite, DpaVersion } from '../../../../../types/dpa';
import { DataProcessingAgreementCard, LegalVersion } from '../DataProcessingAgreementCard';
import { getEditableLanguages, parseLegalContentMap } from '../../utils/legalContentLanguages';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { useDpaGate } from '../../../../../hooks/useDpaGate.hook';
import { createDpaSignInvite, resolveDpaSignLink } from '../../../../../api/tenant/createDpaSignInvite';
import { isDpaInviteEmailDeliveryFailure, sendDpaInviteEmail } from '../../../../../api/tenant/sendDpaInviteEmail';
import { useDpaStatus } from '../../../../../hooks/useDpaStatus.hook';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { formatBerlinDateTime } from '../../utils/utcTimestamp';
import { DpaForwardDialog } from '../../../../DpaForwardDialog/DpaForwardDialog';
import { DpaForwardLink, DpaForwardOutcome } from '../../../../../api/tenantOnboarding/dpaForward';
import { DpaPublishDeadlineDialog } from '../DpaPublishDeadlineDialog';
import { parseBackendInstant } from '../../../../../utils/backendInstant';
import { useDpaOperationScope } from '../../../../../hooks/useDpaOperationScope.hook';
import { UserRole } from '../../../../../enums/UserRole';
import { resolveDpaGateSubject } from '../../../../../utils/dpaBlockerGate';
import styles from './styles.module.scss';

interface DataProcessingAgreementContainerProps {
    tenantId: string | number;
    /** Read-only view (agency page): the DPA is managed at tenant (Träger) level. */
    readOnly?: boolean;
}

/**
 * Container for the DPA card: loads the tenant's published versions and the tenant's active
 * languages, hands the card the complete latest content map for per-language editing, and wires
 * the publish mutation. The card submits the complete merged map, so publishing in one UI
 * language never drops the other languages (or unknown keys) any more.
 */
export const DataProcessingAgreementContainer = ({ tenantId, readOnly }: DataProcessingAgreementContainerProps) => {
    const { t, i18n } = useTranslation();
    const id = Number(tenantId);
    const lang = i18n.language?.split('-')[0] || 'de';

    const versionsEnabled = Number.isFinite(id) && id > 0;
    const {
        data: versions = [],
        isLoading: isVersionsLoading,
        isError: versionsError,
        refetch: refetchVersions,
    } = useDpaVersions(id, versionsEnabled);
    const { mutate: publish, isPending } = usePublishDpa(id);
    const { data: tenantData } = useTenantAdminData();
    const { translate } = useTranslateLegalContent();
    const { data: userData, isLoading: isUserLoading } = useUserData();
    const { hasRole, isSuperAdmin, tenantId: accountTenantId, tokenUnreadable } = useUserRoles();
    const isDpaRecipient =
        resolveDpaGateSubject({
            hasTenantAdminRole: hasRole(UserRole.TenantAdmin),
            hasSingleTenantAdminRole: hasRole(UserRole.SingleTenantAdmin),
            isSuperAdmin,
            tenantId: accountTenantId,
            tokenUnreadable,
        }) === 'subject';
    const {
        data: dpaGate,
        isError: dpaGateError,
        refetch: refetchDpaGate,
    } = useDpaGate(id, Number.isFinite(id) && id > 0);
    const latestVersionId = (versions as DpaVersion[])[0]?.activationDate;
    const gateForDocument =
        !dpaGate?.currentDpaVersion || dpaGate.currentDpaVersion === latestVersionId ? dpaGate : undefined;
    useEffect(() => {
        if (dpaGate?.currentDpaVersion && dpaGate.currentDpaVersion !== latestVersionId) {
            refetchVersions();
        }
    }, [dpaGate?.currentDpaVersion, latestVersionId, refetchVersions]);
    // The owner status combines forwarded and in-app signatures. Observe the
    // gate's existing query without dropping its cache when this card mounts.
    // Agency readers must never call the tenant-admin-only status endpoint.
    const signatureStatusEnabled = isDpaRecipient && id === accountTenantId && versionsEnabled;
    const {
        data: signatureStatus,
        isError: signatureStatusError,
        refetch: refetchSignatureStatus,
    } = useDpaStatus(id, signatureStatusEnabled, { dropCacheOnMount: false });
    const signatureForDocument =
        signatureStatusEnabled &&
        !signatureStatusError &&
        gateForDocument &&
        signatureStatus?.tenantId === id &&
        signatureStatus.currentDpaVersion === latestVersionId
            ? signatureStatus
            : undefined;
    const signedVersion = signatureForDocument?.signedDpaVersion;
    const currentSignature =
        signatureForDocument?.status === 'VALID' &&
        !!signedVersion &&
        signedVersion === latestVersionId &&
        gateForDocument?.dpaSigned === true;
    const retainedSignature =
        signatureForDocument?.status === 'OUTDATED' &&
        !!signedVersion &&
        signedVersion !== latestVersionId &&
        gateForDocument?.dpaSigned === false;
    useEffect(() => {
        if (
            signatureStatusEnabled &&
            gateForDocument?.currentDpaVersion &&
            signatureStatus?.currentDpaVersion &&
            gateForDocument.currentDpaVersion !== signatureStatus.currentDpaVersion
        ) {
            refetchSignatureStatus();
        }
    }, [
        signatureStatusEnabled,
        gateForDocument?.currentDpaVersion,
        signatureStatus?.currentDpaVersion,
        refetchSignatureStatus,
    ]);
    const { scope: identity, isCurrent: isPublicationCurrent } = useDpaOperationScope(
        id,
        userData?.id,
        latestVersionId,
    );
    // Invalidate an invite as soon as the gate discovers a renewal, even while
    // the matching contract is still loading. Links belong to that publication.
    const { scope: invitationIdentity, isCurrent: isInvitationCurrent } = useDpaOperationScope(
        id,
        userData?.id,
        dpaGate?.currentDpaVersion ?? latestVersionId,
    );
    const [forwardState, setForwardState] = useState<{
        identity: typeof invitationIdentity;
        signLink?: string;
        signInvite?: DpaSignInvite;
        open?: boolean;
        sentTo?: string | null;
    }>({ identity: invitationIdentity });
    const forwarding = forwardState.identity === invitationIdentity ? forwardState : { identity: invitationIdentity };
    if (forwarding !== forwardState) setForwardState(forwarding);
    const { signLink, signInvite, open: forwardDialogOpen, sentTo: inviteEmailSentTo } = forwarding;
    const setForwardDialogOpen = (open: boolean) => {
        if (isInvitationCurrent()) setForwardState((current) => ({ ...current, open }));
    };
    const invitationRequest = useRef<
        { identity: typeof invitationIdentity; promise: Promise<DpaForwardLink> } | undefined
    >(undefined);
    const [publicationState, setPublicationState] = useState<{
        identity: typeof identity;
        pending?: Record<string, string>;
        error?: string;
    }>({ identity });
    const publication = publicationState.identity === identity ? publicationState : { identity };
    if (publication !== publicationState) setPublicationState(publication);
    const pendingPublication = publication.pending;
    const publishError = publication.error;
    const setPublishError = useCallback(
        (error?: string) => {
            if (isPublicationCurrent()) setPublicationState((current) => ({ ...current, error }));
        },
        [isPublicationCurrent],
    );
    const setPendingPublication = (pending?: Record<string, string>) => {
        if (isPublicationCurrent()) setPublicationState((current) => ({ ...current, pending }));
    };
    const effectiveReadOnly = !!readOnly || isDpaRecipient;
    // Persist a dismissal only once the opaque user id is known. Usernames and
    // email addresses must not become storage keys, and late identity loading
    // must not remount the editor (which would discard an in-progress draft).
    const dismissalScope = userData?.id ? `${id}:${userData.id}` : undefined;

    const latestContentByLanguage = useMemo(
        () => parseLegalContentMap((versions as DpaVersion[])[0]?.content),
        [versions],
    );
    // Publishing the DPA stamps a new version every tenant must sign again, so the
    // admin needs a way to stop mid-text. Until the backend has draft state this is
    // device-local — the card says so via LegalDraftNotice.
    const { draft, savedAt, isStale, saveDraft, discardDraft } = useLegalDraft(
        'dpa',
        effectiveReadOnly ? undefined : dismissalScope,
        latestVersionId,
        setPublishError,
    );
    const editorContentByLanguage = draft?.content ?? latestContentByLanguage;
    const languages = useMemo(
        () => getEditableLanguages(tenantData?.settings?.activeLanguages, editorContentByLanguage),
        [tenantData?.settings?.activeLanguages, editorContentByLanguage],
    );

    const mapped: LegalVersion[] = useMemo(
        () =>
            (versions as DpaVersion[]).map((version, index) => {
                const dateLabel = formatBerlinDateTime(version.activationDate, lang);
                return {
                    id: version.activationDate,
                    label: index === 0 ? `${dateLabel} ${t('tenants.legal.version.current')}` : dateLabel,
                    // Complete stored map — the card picks the admin's active language.
                    content: version.content,
                };
            }),
        [versions, lang, t],
    );
    const signedAtLabel = useMemo(() => {
        if (!signatureForDocument?.signedAt) return undefined;
        return formatBerlinDateTime(signatureForDocument.signedAt, lang);
    }, [lang, signatureForDocument?.signedAt]);

    /**
     * Shared forward dialog seam (#723). Reuse only a live invite for the
     * currently viewed tenant, account and publication.
     */
    const ensureSignLink = async (): Promise<DpaForwardLink> => {
        if (!isInvitationCurrent()) throw new Error('The viewed DPA changed.');
        if (signInvite && signLink && parseBackendInstant(signInvite.expiresAt).getTime() > Date.now()) {
            return { signUrl: signLink, expiresAt: signInvite.expiresAt };
        }
        if (invitationRequest.current?.identity === invitationIdentity) return invitationRequest.current.promise;
        const promise = (async () => {
            const invite = await createDpaSignInvite(id);
            if (!isInvitationCurrent()) throw new Error('The viewed DPA changed.');
            const resolvedSignLink = resolveDpaSignLink(invite.signLink);
            setForwardState((current) => ({ ...current, signInvite: invite, signLink: resolvedSignLink }));
            return { signUrl: resolvedSignLink, expiresAt: invite.expiresAt };
        })();
        invitationRequest.current = { identity: invitationIdentity, promise };
        try {
            return await promise;
        } finally {
            if (invitationRequest.current?.promise === promise) invitationRequest.current = undefined;
        }
    };

    const forward = async ({ recipientEmail }: { recipientEmail?: string }): Promise<DpaForwardOutcome> => {
        const link = await ensureSignLink();
        if (!isInvitationCurrent()) throw new Error('The viewed DPA changed.');
        if (!recipientEmail) {
            return { link, mailFailed: false };
        }
        try {
            // The authenticated delivery endpoint (UserService #530) carries no
            // recipient name — the salutation falls back to the template default.
            await sendDpaInviteEmail({
                tenantId: id,
                recipientEmail,
                signLink: link.signUrl,
                expiresAt: link.expiresAt ?? '',
            });
            return { link, mailFailed: false };
        } catch (error) {
            if (!isDpaInviteEmailDeliveryFailure(error)) {
                throw error;
            }
            // Same shape as the public 502: the link exists, the mail did not go.
            return { link, mailFailed: true };
        }
    };

    // The versions ARE the content: rendering the card before they land shows an empty
    // contract, and the arriving version flips the remount key — discarding edits and
    // stamping any draft saved in that window with an undefined base version, which
    // would make the stale warning permanently blind for it. A disabled query (no
    // usable tenant id) is not "loading" in react-query v5, so it does not block here.
    if (versionsEnabled && isVersionsLoading) {
        return <Spin />;
    }

    // The draft scope needs the opaque user id, and an EDITABLE card mounted before it
    // arrives would be remounted the moment the draft hydrates — throwing away anything
    // typed in between. A read-only viewer never gets a draft, so withholding the
    // published contract from them behind an unrelated query would be a regression.
    if (isUserLoading && !effectiveReadOnly) {
        return <Spin />;
    }

    // A failed version load must not masquerade as "no versions yet": editing a
    // legal text on an unknown current state could silently overwrite it, so we
    // withhold the editor and offer a retry instead.
    if (versionsError) {
        return (
            <Alert
                type="error"
                showIcon
                message={t('tenants.legal.version.loadError')}
                action={
                    <Button size="small" onClick={() => refetchVersions()}>
                        {t('tenants.legal.version.retry')}
                    </Button>
                }
            />
        );
    }

    return (
        <>
            <DataProcessingAgreementCard
                // Remount when the stored content changes (e.g. after a publish) so the editor
                // resets to it, and when a stored draft appears or is discarded. Saving a draft
                // deliberately does NOT change this key — it would reset the editor mid-edit.
                key={`${id}|${latestVersionId ?? ''}|${draft?.savedAt ?? ''}`}
                initialContentByLanguage={editorContentByLanguage}
                languages={languages}
                versions={mapped}
                onPublish={(contentByLanguage) => {
                    setPublishError(undefined);
                    setPendingPublication(contentByLanguage);
                }}
                publishing={isPending}
                onTranslate={effectiveReadOnly ? undefined : translate}
                readOnly={effectiveReadOnly}
                dpaSigned={gateForDocument?.dpaSigned}
                signingDeadlineAt={
                    gateForDocument?.signingDeadlineAt ?? (versions as DpaVersion[])[0]?.signingDeadlineAt
                }
                dpaStatus={gateForDocument?.dpaStatus}
                newCounsellingAllowed={gateForDocument?.newCounsellingAllowed}
                renewalGraceActive={gateForDocument?.renewalGraceActive}
                errorMessage={publishError}
                onCloseError={() => setPublishError(undefined)}
                dismissalScope={dismissalScope}
                onSaveDraft={effectiveReadOnly || !dismissalScope ? undefined : saveDraft}
                draftSavedAt={savedAt}
                draftStale={isStale}
                onDiscardDraft={effectiveReadOnly || !dismissalScope ? undefined : discardDraft}
                readOnlyFooter={
                    effectiveReadOnly && (currentSignature || retainedSignature) && signedAtLabel && signedVersion ? (
                        <>
                            {currentSignature && <Check aria-hidden />}
                            <Space direction="vertical" size="small">
                                {retainedSignature && <span>{t('legal.dpa.sign.previousRetained')}</span>}
                                <span>
                                    {t('legal.dpa.sign.signedVersion', {
                                        version: formatBerlinDateTime(signedVersion, lang),
                                    })}
                                </span>
                                <span>
                                    {t('legal.dpa.sign.confirmedAt')}: {signedAtLabel}
                                    {signatureForDocument?.signedBy &&
                                        `, ${t('legal.dpa.sign.by')} ${signatureForDocument.signedBy}`}
                                </span>
                            </Space>
                        </>
                    ) : undefined
                }
            />
            {pendingPublication && (
                <DpaPublishDeadlineDialog
                    publishing={isPending}
                    onCancel={() => setPendingPublication(undefined)}
                    onConfirm={(signingDeadlineAt) =>
                        publish(
                            { contentByLanguage: pendingPublication, signingDeadlineAt },
                            {
                                onSuccess: () => {
                                    if (!isPublicationCurrent()) return;
                                    discardDraft();
                                    setPendingPublication(undefined);
                                },
                                onError: () => {
                                    if (!isPublicationCurrent()) return;
                                    setPendingPublication(undefined);
                                    setPublishError(t('tenants.legal.version.publishError'));
                                },
                            },
                        )
                    }
                />
            )}
            {isDpaRecipient && dpaGateError && (
                <Alert
                    type="error"
                    showIcon
                    message={t('legal.dpa.sign.gateLoadError')}
                    action={
                        <Button size="small" onClick={() => refetchDpaGate()}>
                            {t('tenants.legal.version.retry')}
                        </Button>
                    }
                />
            )}
            {isDpaRecipient && gateForDocument?.dpaPublished && !gateForDocument.dpaSigned && (
                <>
                    <Alert
                        type="warning"
                        showIcon
                        message={t('legal.dpa.sign.required')}
                        description={
                            <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 520 }}>
                                <span>{t('legal.dpa.sign.description')}</span>
                                {inviteEmailSentTo && (
                                    <Alert type="success" showIcon message={t('legal.dpa.sign.sent')} />
                                )}
                                <Space wrap className={styles.recoveryActions}>
                                    {/* Opens the SHARED forward dialog (#723): copyable
                                        link plus optional e-mail send with the actual
                                        DPA_FORWARD mail preview. */}
                                    <Button
                                        type="primary"
                                        className={styles.recoveryButton}
                                        onClick={() => setForwardDialogOpen(true)}
                                    >
                                        {t('legal.dpa.sign.sendLink')}
                                    </Button>
                                    {signLink && (
                                        <Button
                                            className={styles.recoveryButton}
                                            onClick={() => window.location.assign(signLink)}
                                        >
                                            {t('legal.dpa.sign.openLink')}
                                        </Button>
                                    )}
                                </Space>
                            </Space>
                        }
                        action={null}
                    />
                    {forwardDialogOpen && (
                        <DpaForwardDialog
                            forward={forward}
                            tenantId={id}
                            // Legal Settings lives behind ProtectedRoute, so the
                            // admin-only branded mail preview is reachable here.
                            surface="admin"
                            onClose={() => setForwardDialogOpen(false)}
                            onForwarded={({ recipientEmail }) => {
                                if (!isInvitationCurrent()) return;
                                setForwardDialogOpen(false);
                                setForwardState((current) => ({ ...current, sentTo: recipientEmail }));
                            }}
                        />
                    )}
                </>
            )}
            {signatureStatusEnabled && gateForDocument && signatureStatusError && (
                <Alert
                    type="error"
                    showIcon
                    message={t('legal.dpa.sign.detailsLoadError')}
                    action={
                        <Button size="small" onClick={() => refetchSignatureStatus()}>
                            {t('tenants.legal.version.retry')}
                        </Button>
                    }
                />
            )}
        </>
    );
};

export default DataProcessingAgreementContainer;
