import { useMemo, useState } from 'react';
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
import { sendDpaInviteEmail } from '../../../../../api/tenant/sendDpaInviteEmail';
import { useDpaSignatures } from '../../../../../hooks/useDpaSignatures.hook';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { DpaForwardDialog } from '../../../../DpaForwardDialog/DpaForwardDialog';
import { DpaForwardLink, DpaForwardOutcome } from '../../../../../api/tenantOnboarding/dpaForward';

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
    const { isTenantScopedAdmin } = useUserRoles();
    const {
        data: dpaGate,
        isError: dpaGateError,
        refetch: refetchDpaGate,
    } = useDpaGate(id, isTenantScopedAdmin && Number.isFinite(id) && id > 0);
    const { data: dpaSignatures = [], isError: dpaSignaturesError } = useDpaSignatures(
        id,
        isTenantScopedAdmin && dpaGate?.dpaSigned === true,
    );
    const [signLink, setSignLink] = useState<string>();
    const [signInvite, setSignInvite] = useState<DpaSignInvite>();
    const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
    const [inviteEmailSentTo, setInviteEmailSentTo] = useState<string | null>(null);
    const effectiveReadOnly = !!readOnly || isTenantScopedAdmin;
    // Persist a dismissal only once the opaque user id is known. Usernames and
    // email addresses must not become storage keys, and late identity loading
    // must not remount the editor (which would discard an in-progress draft).
    const dismissalScope = userData?.id ? `${id}:${userData.id}` : undefined;

    const latestVersionId = (versions as DpaVersion[])[0]?.activationDate;
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
    );
    const editorContentByLanguage = draft?.content ?? latestContentByLanguage;
    const languages = useMemo(
        () => getEditableLanguages(tenantData?.settings?.activeLanguages, editorContentByLanguage),
        [tenantData?.settings?.activeLanguages, editorContentByLanguage],
    );

    const mapped: LegalVersion[] = useMemo(
        () =>
            (versions as DpaVersion[]).map((version, index) => {
                const date = new Date(version.activationDate);
                const dateLabel = Number.isNaN(date.getTime())
                    ? version.activationDate
                    : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
                return {
                    id: version.activationDate,
                    label: index === 0 ? `${dateLabel} ${t('tenants.legal.version.current')}` : dateLabel,
                    // Complete stored map — the card picks the admin's active language.
                    content: version.content,
                };
            }),
        [versions, lang, t],
    );
    const latestSignedDpa = useMemo(
        () =>
            [...dpaSignatures]
                .filter((signature) => signature.status === 'SIGNED' && signature.signedAt)
                .sort((left, right) => String(right.signedAt).localeCompare(String(left.signedAt)))[0],
        [dpaSignatures],
    );
    const signedAtLabel = useMemo(() => {
        if (!latestSignedDpa?.signedAt) return undefined;
        const date = new Date(latestSignedDpa.signedAt);
        return Number.isNaN(date.getTime())
            ? latestSignedDpa.signedAt
            : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
    }, [lang, latestSignedDpa?.signedAt]);

    /**
     * Shared forward dialog seam (#723). A created invite is reused for the
     * lifetime of this view — every issued link stays valid until a signature
     * lands, so repeated opens need not mint fresh tokens here.
     */
    const ensureSignLink = async (): Promise<DpaForwardLink> => {
        if (signInvite && signLink) {
            return { signUrl: signLink, expiresAt: signInvite.expiresAt };
        }
        const invite = await createDpaSignInvite(id);
        const resolvedSignLink = resolveDpaSignLink(invite.signLink);
        setSignInvite(invite);
        setSignLink(resolvedSignLink);
        return { signUrl: resolvedSignLink, expiresAt: invite.expiresAt };
    };

    const forward = async ({ recipientEmail }: { recipientEmail?: string }): Promise<DpaForwardOutcome> => {
        const link = await ensureSignLink();
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
        } catch {
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
                key={`${latestVersionId ?? ''}|${draft?.savedAt ?? ''}`}
                initialContentByLanguage={editorContentByLanguage}
                languages={languages}
                versions={mapped}
                onPublish={(contentByLanguage) => publish(contentByLanguage, { onSuccess: () => discardDraft() })}
                publishing={isPending}
                onTranslate={readOnly ? undefined : translate}
                readOnly={effectiveReadOnly}
                dpaSigned={dpaGate?.dpaSigned}
                dismissalScope={dismissalScope}
                onSaveDraft={effectiveReadOnly || !dismissalScope ? undefined : saveDraft}
                draftSavedAt={savedAt}
                draftStale={isStale}
                onDiscardDraft={effectiveReadOnly || !dismissalScope ? undefined : discardDraft}
                readOnlyFooter={
                    effectiveReadOnly && latestSignedDpa && signedAtLabel ? (
                        <>
                            <Check aria-hidden />
                            <span>
                                {t('legal.dpa.sign.confirmedAt')}: {signedAtLabel}, {t('legal.dpa.sign.by')}{' '}
                                {latestSignedDpa.signerName}
                            </span>
                        </>
                    ) : undefined
                }
            />
            {isTenantScopedAdmin && dpaGateError && (
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
            {isTenantScopedAdmin && dpaGate?.dpaPublished && !dpaGate.dpaSigned && (
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
                                <Space wrap>
                                    {/* Opens the SHARED forward dialog (#723): copyable
                                        link plus optional e-mail send with the actual
                                        DPA_FORWARD mail preview. */}
                                    <Button type="primary" onClick={() => setForwardDialogOpen(true)}>
                                        {t('legal.dpa.sign.sendLink')}
                                    </Button>
                                    {signLink && (
                                        <Button onClick={() => window.location.assign(signLink)}>
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
                            onClose={() => setForwardDialogOpen(false)}
                            onForwarded={({ recipientEmail }) => {
                                setForwardDialogOpen(false);
                                setInviteEmailSentTo(recipientEmail);
                            }}
                        />
                    )}
                </>
            )}
            {isTenantScopedAdmin && dpaGate?.dpaSigned && dpaSignaturesError && (
                <Alert type="error" showIcon message={t('legal.dpa.sign.detailsLoadError')} />
            )}
        </>
    );
};

export default DataProcessingAgreementContainer;
