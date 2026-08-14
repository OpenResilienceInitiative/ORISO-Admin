import { useMemo, useState } from 'react';
import { Alert, Button, Input, Space, Spin } from 'antd';
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
import { useCreateDpaInvite } from '../../../../../hooks/useCreateDpaInvite.hook';
import { resolveDpaSignLink } from '../../../../../api/tenant/createDpaSignInvite';
import { useDpaSignatures } from '../../../../../hooks/useDpaSignatures.hook';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { useSendDpaInviteEmail } from '../../../../../hooks/useSendDpaInviteEmail.hook';

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

    const {
        data: versions = [],
        isError: versionsError,
        refetch: refetchVersions,
    } = useDpaVersions(id, Number.isFinite(id) && id > 0);
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
    const { mutate: createSignInvite, isPending: isCreatingSignInvite } = useCreateDpaInvite(id);
    const { mutate: sendSignInviteEmail, isPending: isSendingSignInviteEmail } = useSendDpaInviteEmail();
    const { data: dpaSignatures = [], isError: dpaSignaturesError } = useDpaSignatures(
        id,
        isTenantScopedAdmin && dpaGate?.dpaSigned === true,
    );
    const [signLink, setSignLink] = useState<string>();
    const [signInvite, setSignInvite] = useState<DpaSignInvite>();
    const [recipientEmail, setRecipientEmail] = useState('');
    const [inviteEmailStatus, setInviteEmailStatus] = useState<'idle' | 'invalid' | 'sent' | 'failed'>('idle');
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

    const sendInvite = (invite: DpaSignInvite) => {
        const resolvedSignLink = resolveDpaSignLink(invite.signLink);
        setSignInvite(invite);
        setSignLink(resolvedSignLink);
        sendSignInviteEmail(
            {
                tenantId: id,
                recipientEmail: recipientEmail.trim(),
                signLink: resolvedSignLink,
                expiresAt: invite.expiresAt,
            },
            {
                onSuccess: () => setInviteEmailStatus('sent'),
                onError: () => setInviteEmailStatus('failed'),
            },
        );
    };

    const handleSendInvite = () => {
        if (!/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) {
            setInviteEmailStatus('invalid');
            return;
        }
        setInviteEmailStatus('idle');
        if (signInvite) {
            sendInvite(signInvite);
            return;
        }
        createSignInvite(undefined, {
            onSuccess: sendInvite,
            onError: () => setInviteEmailStatus('failed'),
        });
    };

    // A failed version load must not masquerade as "no versions yet": editing a
    // legal text on an unknown current state could silently overwrite it, so we
    // withhold the editor and offer a retry instead.
    // Same reason as LegalText: the draft scope needs the opaque user id, and a card
    // mounted before it arrives would be remounted the moment the draft loads —
    // throwing away anything typed in between.
    if (isUserLoading) {
        return <Spin />;
    }

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
                <Alert
                    type="warning"
                    showIcon
                    message={t('legal.dpa.sign.required')}
                    description={
                        <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 520 }}>
                            <span>{t('legal.dpa.sign.description')}</span>
                            <Input
                                type="email"
                                aria-label={t('legal.dpa.sign.recipientEmail')}
                                placeholder={t('legal.dpa.sign.recipientEmail')}
                                value={recipientEmail}
                                status={inviteEmailStatus === 'invalid' ? 'error' : undefined}
                                onChange={(event) => {
                                    setRecipientEmail(event.target.value);
                                    setInviteEmailStatus('idle');
                                }}
                            />
                            {inviteEmailStatus === 'invalid' && (
                                <Alert type="error" showIcon message={t('legal.dpa.sign.invalidEmail')} />
                            )}
                            {inviteEmailStatus === 'failed' && (
                                <Alert type="error" showIcon message={t('legal.dpa.sign.sendFailed')} />
                            )}
                            {inviteEmailStatus === 'sent' && (
                                <Alert type="success" showIcon message={t('legal.dpa.sign.sent')} />
                            )}
                            <Space wrap>
                                <Button
                                    type="primary"
                                    loading={isCreatingSignInvite || isSendingSignInviteEmail}
                                    onClick={handleSendInvite}
                                >
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
            )}
            {/* The "agreement signed" confirmation itself now lives in the editor's own
                success snackbar (Figma 1261-51137). What stays here is the audit detail —
                who signed and when — which only makes sense once a signature exists. */}
            {isTenantScopedAdmin && dpaGate?.dpaSigned && latestSignedDpa && (
                <Alert
                    type="success"
                    showIcon
                    message={t('legal.dpa.sign.signedBy')}
                    description={
                        latestSignedDpa && (
                            <div>
                                <strong>{latestSignedDpa.signerName}</strong>
                                {latestSignedDpa.signerPosition && <div>{latestSignedDpa.signerPosition}</div>}
                                {latestSignedDpa.signerEmail && <div>{latestSignedDpa.signerEmail}</div>}
                                {latestSignedDpa.signerOrganisation && <div>{latestSignedDpa.signerOrganisation}</div>}
                                {signedAtLabel && (
                                    <div>
                                        {t('legal.dpa.sign.confirmedAt')}: {signedAtLabel}
                                    </div>
                                )}
                            </div>
                        )
                    }
                />
            )}
            {isTenantScopedAdmin && dpaGate?.dpaSigned && dpaSignaturesError && (
                <Alert type="error" showIcon message={t('legal.dpa.sign.detailsLoadError')} />
            )}
        </>
    );
};

export default DataProcessingAgreementContainer;
