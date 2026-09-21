import set from 'lodash.set';
import { Alert, notification, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalProps } from '../../../../Modal';
import { EditorVersionSection, M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../FormPluginEditor/EditorHelpText';
import { EditorHintSnackbar } from '../../../../FormPluginEditor/EditorHintSnackbar';
import { useLegalHelp } from '../../hooks/useLegalHelp';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { useLegalTextVersions } from '../../../../../hooks/useLegalTextVersions.hook';
import { LegalConsentField } from '../LegalConsentField';
import { LegalDraftNotice } from '../LegalDraftNotice';
import { TenantLegalDraftNotice } from '../TenantLegalDraftNotice';
import { DraftStatusSnackbar, isDraftInfoState } from '../DraftStatusSnackbar';
import { EditorSnackbarQueue } from '../../../../FormPluginEditor/EditorSnackbarQueue';
import { useTenantLegalDraft } from '../../hooks/useTenantLegalDraft';
import { useLegalTemplateHistory } from '../../hooks/useLegalTemplateHistory';
import { SendLegalTemplateDialog, TemplateRecipientLevel } from '../SendLegalTemplateDialog';
import { isSameDraftContent } from '../../utils/draftComparison';
import { parseUtcTimestamp } from '../../utils/utcTimestamp';
import { consentPublicationBlockers, MANDATORY_CONSENT_TOKEN } from '../../utils/consentTextValidation';
import { toEditorVersions } from '../../utils/legalVersionOptions';
import { useViewedLegalVersion } from '../../hooks/useViewedLegalVersion';
import { isEmptyLegalContent } from '../../utils/legalHelpTexts';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { useUserData } from '../../../../../hooks/useUserData.hook';
import styles from './styles.module.scss';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import type { TenantLegalDraft } from '../../../../../api/tenant/legalDrafts';

// Hint snackbar dismissal: "Nicht mehr anzeigen" persists; X is session-only.
const hintDismissedKey = (type: 'privacy' | 'imprint') => `oriso-admin.legal.${type}.hint.dismissed`;
const hintSessionKey = (type: 'privacy' | 'imprint') => `oriso-admin.legal.${type}.hint.closed`;

const scopedKey = (key: string, scope: string) => `${key}.${scope}`;

const VERSION_HISTORY_STATUS_KEYS = {
    loading: 'legal.versions.loading',
    unsupported: 'legal.versions.unsupported',
    unavailable: 'legal.versions.unavailable.title',
} as const;

const isHintDismissed = (type: 'privacy' | 'imprint', scope: string) => {
    try {
        return (
            window.localStorage.getItem(scopedKey(hintDismissedKey(type), scope)) === 'true' ||
            window.sessionStorage.getItem(scopedKey(hintSessionKey(type), scope)) === 'true'
        );
    } catch {
        return false;
    }
};

const persistHintDismissed = (type: 'privacy' | 'imprint', scope: string) => {
    try {
        window.localStorage.setItem(scopedKey(hintDismissedKey(type), scope), 'true');
    } catch {
        // Private mode / storage disabled: the snackbar just reappears next session.
    }
};

const persistHintClosedForSession = (type: 'privacy' | 'imprint', scope: string) => {
    try {
        window.sessionStorage.setItem(scopedKey(hintSessionKey(type), scope), 'true');
    } catch {
        // Private mode / storage disabled: the close still works for this mount.
    }
};

interface LegalTextProps {
    tenantId: string | number;
    /**
     * Owner of the server-side draft. Defaults to `tenantId`; differs only for the platform, whose
     * draft TenantService keeps under tenant 0 while the published text lives on the main tenant.
     */
    draftTenantId?: string | number;
    /**
     * Lets a Träger offer its saved draft to its own Beratungsstellen as a template — the
     * rung below the platform's. Off until the AgencyService side exists
     * (OpenResilienceInitiative/ORISO-AgencyService#303); the stories switch it on so the
     * UX can be agreed first.
     */
    offerTemplatesToAgencies?: boolean;
    fieldName: string[];
    titleKey: string;
    /**
     * Which legal text this card edits — selects the role/state dependent help
     * texts (description + bold CTA tip, Figma 457-13255). When omitted, the
     * static `subTitle` is shown instead.
     */
    legalType?: 'privacy' | 'imprint';
    subTitle?: string | React.ReactElement<any> | number | string;
    placeHolderKey: string;
    /** Header icon for the M3 shell; defaults to the Impressum fingerprint. */
    icon?: React.ElementType;
    showConfirmationModal?: Omit<ModalProps, 'onClose' | 'onConfirm'> & { field: string[] };
    placeholders?: { [key: string]: string };
}

/**
 * Imprint / privacy card in the M3 editor shell (Figma Admin.ORISO 1-53274).
 * The M3RichTextEditor is the editing engine (per active language, incl. the
 * placeholder dropdown and anchor navigation); local edits are kept per language
 * and publishing sends the COMPLETE language map through the tenant-admin
 * mutation — untouched languages and unknown stored keys are never dropped.
 * The optional confirmation modal (privacy) stays in front of the save.
 */
export const LegalText = ({
    tenantId,
    draftTenantId,
    offerTemplatesToAgencies = false,
    fieldName,
    titleKey,
    legalType,
    subTitle,
    placeHolderKey,
    icon,
    showConfirmationModal,
    placeholders,
}: LegalTextProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language?.split('-')[0] || 'de';
    const { can } = useUserPermissions();
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const { data, isLoading, mutateAsync: updateTenantAsync, isPending } = useTenantAppearanceFormData(`${tenantId}`);
    const { data: userData, isLoading: isUserLoading } = useUserData();
    // Persist dismissal only once the opaque user id is known (same pattern as DPA).
    const dismissalScope = userData?.id ? `${tenantId}:${userData.id}` : undefined;
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    // Closing the draft snackbar hides it for THIS saved version; a newer save shows it again.
    const [closedDraftSnackbar, setClosedDraftSnackbar] = useState<string | undefined>();
    const [pendingFormData, setPendingFormData] = useState<Record<string, unknown>>();
    const [pendingDraftRevision, setPendingDraftRevision] = useState<string>();
    const [modalVisible, setModalVisible] = useState(false);
    const [hintHidden, setHintHidden] = useState(() =>
        legalType && dismissalScope ? isHintDismissed(legalType, dismissalScope) : false,
    );
    const [consentEdits, setConsentEdits] = useState<Record<string, string>>({});
    const [draftSource, setDraftSource] = useState<'local' | 'server'>();
    const [draftActionPending, setDraftActionPending] = useState(false);
    // What the admin is preparing: a template for the level below, the live text, or —
    // until they say so in the version menu — either. Decides which publish action the
    // footer offers.
    const [publishIntentState, setPublishIntentState] = useState<{
        identity: string;
        intent: 'template' | 'live';
    }>();

    // Version look-back for the Träger-level text (ADR-021 decision 3). TenantService
    // has not shipped this collection yet: that must not be phrased as "never
    // published" or turn the persisted current body into an "Entwurf". A genuine
    // failure (403, 500, network) remains separate from both states.
    const { data: versions, historyState } = useLegalTextVersions(
        { level: 'tenant', tenantId: Number(tenantId), kind: legalType === 'imprint' ? 'IMPRINT' : 'DPP' },
        !!legalType,
    );
    const versionsUnavailable = historyState === 'unavailable';
    // Keeps the consent sentence on the same version as the body shown above it.
    const {
        onViewVersionChange,
        viewedConsent,
        isViewingVersion,
        reset: resetViewedVersion,
    } = useViewedLegalVersion(versions);

    const languages = useMemo(() => {
        const configured = data?.settings?.activeLanguages;
        return configured && configured.length > 0 ? configured : ['de'];
    }, [data?.settings?.activeLanguages]);

    // The signed-in account is part of the editor identity: a user change must drop
    // this session's edits, never hand them to the next account.
    const editorIdentity = `${tenantId}:${fieldName.join('.')}:${dismissalScope ?? ''}`;
    const editorIdentityRef = useRef(editorIdentity);
    editorIdentityRef.current = editorIdentity;
    useEffect(() => {
        setEdits({});
        setConsentEdits({});
        setPendingFormData(undefined);
        setPendingDraftRevision(undefined);
        setModalVisible(false);
        setDraftSource(undefined);
        setDraftActionPending(false);
        setActiveLanguage('de');
        setPublishIntentState(undefined);
        resetViewedVersion();
    }, [editorIdentity, resetViewedVersion]);

    // The initial 'de' can be unavailable once the tenant's languages arrive (e.g.
    // an English-only tenant); fall back to the first configured language then.
    useEffect(() => {
        if (!languages.includes(activeLanguage)) {
            setActiveLanguage(languages[0]);
        }
    }, [languages, activeLanguage]);

    // Stored content for this legal text (language map or legacy string) — the
    // help texts distinguish "nothing published yet" from "text exists".
    const storedContent = useMemo(
        () => fieldName.reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], data),
        [data, fieldName],
    );

    // Keep reading the former device-local format so existing work can be imported
    // deliberately into tenant server drafts. Agency and DPA editors continue to use
    // this shared local hook unchanged.
    const { draft, savedAt, discardDraft } = useLegalDraft(
        legalType ?? 'privacy',
        legalType ? dismissalScope : undefined,
    );
    const serverDraft = useTenantLegalDraft(
        draftTenantId ?? tenantId,
        legalType === 'imprint' ? 'IMPRINT' : 'PRIVACY',
        canEditLegalText && !!legalType,
    );
    const [serverBaseState, setServerBaseState] = useState<{
        identity: string;
        draft: TenantLegalDraft | null | undefined;
        revision: string | undefined;
    }>(() => ({ identity: editorIdentity, draft: undefined, revision: undefined }));
    let serverBase = serverBaseState;
    if (serverBase.identity !== editorIdentity) {
        serverBase = { identity: editorIdentity, draft: undefined, revision: undefined };
        setServerBaseState(serverBase);
    }
    // Pin both content and revision when editing starts. A background React Query
    // refresh may discover a newer draft, but it must not silently move the base
    // revision underneath already-authored edits and bypass a 409.
    if (serverBase.draft === undefined && !serverDraft.isLoading && !serverDraft.isError) {
        serverBase = {
            identity: editorIdentity,
            draft: serverDraft.draft ?? null,
            revision: serverDraft.draft?.revision ?? 'new',
        };
        setServerBaseState(serverBase);
    }
    const hasLocalDraft = !!draft;
    const hasServerDraft = !!serverBase.draft;
    const draftCollision = hasLocalDraft && hasServerDraft;
    const sourceChosen = !draftCollision || draftSource !== undefined;
    let selectedDraft: Pick<TenantLegalDraft, 'content' | 'privacyConsent'> | null | undefined = serverBase.draft;
    if (draftSource !== 'server' && hasLocalDraft && (!hasServerDraft || draftSource === 'local')) {
        selectedDraft = { content: draft.content, privacyConsent: draft.consent };
    }

    // The complete language map: stored languages (unknown keys included), then the
    // saved draft, then this session's edits on top. Legacy plain-string content has no
    // language split — keep it under the first configured language so it is shown and
    // preserved on publish (otherwise an untouched card would overwrite the stored
    // string with {}).
    const publishedByLanguage = useMemo<Record<string, string>>(() => {
        if (storedContent && typeof storedContent === 'object') return storedContent as Record<string, string>;
        if (typeof storedContent === 'string' && storedContent !== '') return { [languages[0]]: storedContent };
        return {};
    }, [storedContent, languages]);
    const contentByLanguage = useMemo<Record<string, string>>(() => {
        const base = publishedByLanguage;
        // A viewer who may not edit must never see unpublished local content: the
        // draft notice and its discard action are hidden for them, so they could
        // neither recognise nor remove it. Show the published text only.
        if (!canEditLegalText) {
            return base;
        }
        return { ...base, ...(sourceChosen ? selectedDraft?.content ?? {} : {}), ...edits };
    }, [canEditLegalText, publishedByLanguage, sourceChosen, selectedDraft, edits]);

    /**
     * The consent sentence that belongs to the Träger privacy policy (ADR-021
     * decision 4 — a FIELD of the policy, not a document of its own).
     *
     * TODO(#250): `content.privacyConsent` is the TenantService counterpart of the
     * AgencyService field built on branch `feat/legal-text-versioning-250`; align
     * the property name once that PR settles the contract. `undefined` means the
     * deployed backend has no such field, and the consent editor is not offered —
     * an input that cannot be persisted is worse than none.
     */
    const storedConsent = (data?.content as Record<string, unknown> | undefined)?.privacyConsent;
    const consentEnabled = legalType === 'privacy' && storedConsent !== undefined;
    const consentByLanguage = useMemo<Record<string, string>>(() => {
        const base =
            storedConsent && typeof storedConsent === 'object' ? (storedConsent as Record<string, string>) : {};
        // Same rule as the policy body: a viewer who may not edit sees the published
        // sentence only — they can neither recognise nor discard a local draft.
        if (!canEditLegalText) {
            return base;
        }
        return {
            ...base,
            ...(sourceChosen ? selectedDraft?.privacyConsent ?? {} : {}),
            ...consentEdits,
        };
    }, [canEditLegalText, storedConsent, sourceChosen, selectedDraft, consentEdits]);
    const blockedLanguages = useMemo(
        () => (consentEnabled ? consentPublicationBlockers(consentByLanguage) : []),
        [consentEnabled, consentByLanguage],
    );
    // Named the way the admin reads them, not as wire codes — the notice exists to
    // point at a language tab.
    const blockedLanguageNames = useMemo(
        () => blockedLanguages.map((language) => t(`language.${language}`, language.toUpperCase())).join(', '),
        [blockedLanguages, t],
    );

    // Looking back means looking back at the WHOLE document: the consent sentence
    // archived with that policy version, not today's. Read-only, because the
    // published chain is append-only — editing happens on the current draft.

    // Platform → Träger templates (ORISO-TenantService#262), Träger → Beratungsstellen one rung
    // down. Only the SAVED revision is ever sent: the dialog names that version, so sending what
    // is merely typed would put a different text in front of every recipient than the one named.
    const isPlatformDraft = String(draftTenantId ?? tenantId) === '0';
    let templateLevel: TemplateRecipientLevel | undefined;
    if (isPlatformDraft) templateLevel = 'traeger';
    else if (offerTemplatesToAgencies) templateLevel = 'agencies';
    const templateHistory = useLegalTemplateHistory(
        canEditLegalText && legalType ? templateLevel : undefined,
        legalType === 'imprint' ? 'IMPRINT' : 'PRIVACY',
    );
    const publishIntent = publishIntentState?.identity === editorIdentity ? publishIntentState.intent : undefined;
    const setPublishIntent = useCallback(
        (intent: 'template' | 'live') => setPublishIntentState({ identity: editorIdentity, intent }),
        [editorIdentity],
    );

    const [viewedTemplateId, setViewedTemplateId] = useState<string | null>(null);
    const viewedTemplate = viewedTemplateId
        ? templateHistory.versions.find((version) => `template:${version.distributionId}` === viewedTemplateId)
        : undefined;
    const consentDisplay = viewedTemplate ? viewedTemplate.privacyConsent ?? {} : viewedConsent ?? consentByLanguage;
    const consentReadOnly = !canEditLegalText || isViewingVersion || !!viewedTemplate;

    const editorVersions = useMemo(
        () => toEditorVersions(versions, activeLanguage, locale, t('tenants.legal.version.current')),
        [versions, activeLanguage, locale, t],
    );

    // Discarding drops the stored draft AND this session's unsaved edits — otherwise the
    // editor would still show the text the admin just asked to throw away. If the draft
    // could NOT be removed, the edits stay: the error says the draft is still there, so
    // silently wiping the work typed since the last save would be the worse lie.
    const discardDraftAndEdits = useCallback(async () => {
        const operationIdentity = editorIdentity;
        setDraftActionPending(true);
        try {
            if (serverBase.draft) await serverDraft.discard(serverBase.revision ?? serverBase.draft.revision);
            const localDiscarded = discardDraft();
            if (editorIdentityRef.current === operationIdentity && localDiscarded) {
                setServerBaseState({ identity: operationIdentity, draft: null, revision: 'new' });
                setDraftSource(undefined);
                setEdits({});
                setConsentEdits({});
            }
        } catch {
            if (editorIdentityRef.current === operationIdentity) {
                notification.error({ message: t('legal.serverDraft.discardError'), duration: 8 });
            }
        } finally {
            if (editorIdentityRef.current === operationIdentity) setDraftActionPending(false);
        }
    }, [discardDraft, editorIdentity, serverBase, serverDraft, t]);

    const help = useLegalHelp(legalType ?? 'privacy', {
        empty: isEmptyLegalContent(storedContent),
        readOnly: !canEditLegalText,
    });

    useEffect(() => {
        setHintHidden(legalType && dismissalScope ? isHintDismissed(legalType, dismissalScope) : false);
    }, [legalType, dismissalScope]);

    const showHintSnackbar = !!legalType && !hintHidden;

    const publishSavedDraft = useCallback(
        async (formData: Record<string, unknown>, revision: string, operationIdentity: string) => {
            await updateTenantAsync(formData);
            try {
                await serverDraft.discard(revision);
                discardDraft();
                if (editorIdentityRef.current === operationIdentity) {
                    setServerBaseState({ identity: operationIdentity, draft: null, revision: 'new' });
                    setEdits({});
                    setConsentEdits({});
                }
            } catch {
                // Publication succeeded. Keep any concurrently-created newer draft and
                // let the conflict notice offer the explicit reload/keep-editing choice.
                notification.warning({ message: t('legal.serverDraft.cleanupError'), duration: 8 });
            }
        },
        [discardDraft, serverDraft, t, updateTenantAsync],
    );

    const finishConfirmedPublish = useCallback(
        async (confirmPrivacy: boolean) => {
            if (!pendingFormData || !pendingDraftRevision || !showConfirmationModal) return;
            const formData = set({ ...pendingFormData }, showConfirmationModal.field, confirmPrivacy);
            setModalVisible(false);
            setDraftActionPending(true);
            try {
                await publishSavedDraft(formData, pendingDraftRevision, editorIdentity);
            } catch {
                notification.error({ message: t('legal.serverDraft.publishError'), duration: 8 });
            } finally {
                setDraftActionPending(false);
            }
        },
        [pendingDraftRevision, pendingFormData, publishSavedDraft, showConfirmationModal, t],
    );

    const onConfirm = useCallback(() => finishConfirmedPublish(false), [finishConfirmedPublish]);
    const onCancel = useCallback(() => finishConfirmedPublish(true), [finishConfirmedPublish]);

    const saveCurrentDraft = useCallback(async () => {
        const saved = await serverDraft.save({
            content: { ...contentByLanguage },
            ...(consentEnabled ? { privacyConsent: { ...consentByLanguage } } : {}),
            revision: serverBase.revision ?? 'new',
        });
        discardDraft();
        if (editorIdentityRef.current === editorIdentity) {
            setServerBaseState({ identity: editorIdentity, draft: saved, revision: saved.revision });
            setDraftSource('server');
            notification.success({ message: t('legal.serverDraft.saved'), duration: 4 });
        }
        return saved;
    }, [
        consentByLanguage,
        consentEnabled,
        contentByLanguage,
        discardDraft,
        editorIdentity,
        serverBase.revision,
        serverDraft,
        t,
    ]);

    const onPublish = useCallback(async () => {
        // Refuse before the request: an authored consent sentence without
        // `{{legal_links}}` is rejected server-side (ADR-021 decision 2), and the
        // admin should learn that from the editor, not from a failed publish.
        if (blockedLanguages.length > 0) {
            return;
        }
        setDraftActionPending(true);
        let saved;
        try {
            saved = await saveCurrentDraft();
        } catch {
            notification.error({ message: t('legal.serverDraft.saveError'), duration: 8 });
            setDraftActionPending(false);
            return;
        }
        if (editorIdentityRef.current !== editorIdentity) return;
        // Publish exactly the normalized payload returned by the revision-checked
        // draft write. This keeps the live text and the saved revision identical.
        const formData = set({}, fieldName, { ...saved.content });
        if (consentEnabled && saved.privacyConsent) {
            set(formData, ['content', 'privacyConsent'], { ...saved.privacyConsent });
        }
        try {
            if (showConfirmationModal) {
                setPendingFormData(formData);
                setPendingDraftRevision(saved.revision);
                setModalVisible(true);
                setDraftActionPending(false);
            } else {
                await publishSavedDraft(formData, saved.revision, editorIdentity);
            }
        } catch {
            notification.error({ message: t('legal.serverDraft.publishError'), duration: 8 });
        } finally {
            if (!showConfirmationModal) setDraftActionPending(false);
        }
    }, [
        blockedLanguages,
        consentByLanguage,
        consentEnabled,
        fieldName,
        publishSavedDraft,
        saveCurrentDraft,
        showConfirmationModal,
        t,
    ]);

    // The consent map travels with the draft: storing only the body while reporting
    // a successful save would silently drop the consent wording on the next reload.
    const onSaveDraft = useCallback(async () => {
        setDraftActionPending(true);
        await saveCurrentDraft()
            .catch(() => {
                notification.error({ message: t('legal.serverDraft.saveError'), duration: 8 });
            })
            .finally(() => {
                if (editorIdentityRef.current === editorIdentity) setDraftActionPending(false);
            });
    }, [editorIdentity, saveCurrentDraft, t]);

    // Wait for the opaque user id too, but only where a draft is possible: mounting the
    // editor first and letting the draft arrive later would remount it mid-edit and offer
    // a save action that silently does nothing. A viewer without edit permission has no
    // draft, so the published text must not wait on that query.
    if (isLoading || serverDraft.isLoading || (isUserLoading && canEditLegalText)) {
        return (
            <div className={styles.card}>
                <Spin />
            </div>
        );
    }

    const savedServerDraft = serverBase.draft ?? null;
    const hasUnsavedTemplateChanges =
        !!savedServerDraft &&
        !isSameDraftContent(
            { content: contentByLanguage, consent: consentByLanguage },
            { content: savedServerDraft.content, consent: savedServerDraft.privacyConsent },
            { compareConsent: consentEnabled },
        );
    const publishedConsent =
        storedConsent && typeof storedConsent === 'object' ? (storedConsent as Record<string, string>) : {};
    // "Something new" is measured against what is live and what was last sent — the
    // footer only offers an action that would change something (owner decision 2026-09-21).
    const differsFromPublished = !isSameDraftContent(
        { content: contentByLanguage, consent: consentByLanguage },
        { content: publishedByLanguage, consent: publishedConsent },
        { compareConsent: consentEnabled },
    );
    const hasUnsavedChanges = savedServerDraft ? hasUnsavedTemplateChanges : differsFromPublished;
    const latestTemplate = templateHistory.versions[0];
    const hasAnyContent = Object.values(contentByLanguage).some((html) => !isEmptyLegalContent(html));
    // Until the sent versions are known, "new" cannot be judged; offering the action
    // meanwhile made it flash up and vanish once the list arrived.
    let templateIsNew = hasAnyContent;
    if (templateHistory.state === 'loading') templateIsNew = false;
    else if (latestTemplate) {
        templateIsNew = !isSameDraftContent(
            { content: contentByLanguage, consent: consentByLanguage },
            { content: latestTemplate.content, consent: latestTemplate.privacyConsent },
            { compareConsent: consentEnabled },
        );
    }
    const canPublishTemplate =
        canEditLegalText &&
        !!legalType &&
        !!templateLevel &&
        !serverDraft.isError &&
        !serverDraft.hasConflict &&
        sourceChosen;
    const canPublishLive = canEditLegalText && !serverDraft.isError && !serverDraft.hasConflict && sourceChosen;
    const showTemplateAction = canPublishTemplate && publishIntent !== 'live' && templateIsNew;
    const templateBlockedReason =
        blockedLanguages.length > 0
            ? t('legal.template.disabled.consentToken', { token: `{{${MANDATORY_CONSENT_TOKEN}}}` })
            : undefined;
    const showLiveAction = canPublishLive && publishIntent !== 'template' && differsFromPublished;

    // Offering a template sends the SAVED revision, so unsaved work is saved first —
    // the same way "Veröffentlichen" saves before it publishes.
    const onPublishTemplate = async () => {
        // Same gate as publishing: a consent sentence without {{legal_links}} would reach
        // every recipient as a text none of them can publish.
        if (blockedLanguages.length > 0) return;
        if (hasUnsavedChanges || !savedServerDraft) {
            setDraftActionPending(true);
            try {
                await saveCurrentDraft();
            } catch {
                notification.error({ message: t('legal.serverDraft.saveError'), duration: 8 });
                return;
            } finally {
                setDraftActionPending(false);
            }
        }
        setTemplateDialogOpen(true);
    };

    const documentKey = legalType ?? 'privacy';
    const liveLevelKey = isPlatformDraft ? 'platform' : 'traeger';
    const formatSentAt = (iso: string) => {
        const date = parseUtcTimestamp(iso);
        return Number.isNaN(date.getTime())
            ? iso
            : new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
    };
    const templateSectionTitle = t(`legal.versionMenu.templates.${documentKey}`);
    const liveSectionTitle = t(`legal.versionMenu.live.${liveLevelKey}.${documentKey}`);
    let templateEmptyKey = 'legal.versionMenu.templatesUnavailable';
    if (templateHistory.state === 'available') templateEmptyKey = 'legal.versionMenu.templatesEmpty';
    else if (templateHistory.state === 'loading') templateEmptyKey = 'legal.versions.loading';
    const versionSections: EditorVersionSection[] | undefined =
        templateLevel && legalType
            ? [
                  {
                      key: 'templates',
                      title: templateSectionTitle,
                      versions: templateHistory.versions.map((version, index, list) => ({
                          id: `template:${version.distributionId}`,
                          label: formatSentAt(version.createdAt),
                          name: t('legal.versionMenu.templateVersion', { n: list.length - index }),
                          detail: t(`legal.versionMenu.templateSent.${templateLevel}`, {
                              date: formatSentAt(version.createdAt),
                              count: version.recipientCount,
                          }),
                          content: version.content?.[activeLanguage] ?? '',
                          restorable: version.content?.[activeLanguage] !== undefined,
                      })),
                      emptyLabel: t(templateEmptyKey),
                      createLabel: t('legal.versionMenu.newTemplate'),
                      onCreate: () => setPublishIntent('template'),
                  },
                  {
                      key: 'live',
                      title: liveSectionTitle,
                      versions: editorVersions,
                      emptyLabel:
                          historyState === 'available'
                              ? t('legal.m3Editor.versionEmpty')
                              : t(VERSION_HISTORY_STATUS_KEYS[historyState]),
                      createLabel: t(`legal.versionMenu.newLive.${liveLevelKey}.${documentKey}`),
                      onCreate: () => setPublishIntent('live'),
                  },
              ]
            : undefined;
    let draftVersionLabel = t('legal.m3Editor.versionLabel');
    if (versionSections && publishIntent === 'template') {
        draftVersionLabel = t('legal.versionMenu.draftFor', { target: templateSectionTitle });
    } else if (versionSections && publishIntent === 'live') {
        draftVersionLabel = t('legal.versionMenu.draftFor', { target: liveSectionTitle });
    }

    const draftSnackbarKey = `draft:${serverBase.draft?.updatedAt ?? ''}:${savedAt ?? ''}`;
    const showDraftSnackbar =
        canEditLegalText &&
        !!legalType &&
        closedDraftSnackbar !== draftSnackbarKey &&
        isDraftInfoState({
            savedAt: serverBase.draft?.updatedAt,
            localSavedAt: savedAt,
            // Same rule as the notice: once a source is chosen the collision is answered,
            // and the snackbar (with "Verwerfen") takes over again.
            collision: draftCollision && !sourceChosen,
            unavailable: serverDraft.isError,
            conflict: serverDraft.hasConflict,
        });

    return (
        <div className={styles.card}>
            {canEditLegalText && legalType ? (
                <TenantLegalDraftNotice
                    savedAt={serverBase.draft?.updatedAt}
                    localSavedAt={savedAt}
                    collision={draftCollision && !sourceChosen}
                    loadServer={() => {
                        setDraftSource('server');
                        setEdits({});
                        setConsentEdits({});
                    }}
                    keepLocal={() => {
                        setDraftSource('local');
                        setEdits({});
                        setConsentEdits({});
                    }}
                    unavailable={serverDraft.isError}
                    retry={() => serverDraft.retry()}
                    conflict={serverDraft.hasConflict}
                    conflictRefreshFailed={serverDraft.conflictRefreshFailed}
                    conflictRefreshing={serverDraft.conflictRefreshing}
                    retryConflict={() => serverDraft.retryConflict()}
                    reloadConflict={() => {
                        const remote = serverDraft.conflict;
                        setServerBaseState({
                            identity: editorIdentity,
                            draft: remote ?? null,
                            revision: remote?.revision ?? 'new',
                        });
                        setDraftSource('server');
                        setEdits({});
                        setConsentEdits({});
                        serverDraft.clearConflict();
                    }}
                    keepEditing={() => {
                        setServerBaseState((current) => ({
                            ...current,
                            revision: serverDraft.conflict?.revision ?? 'new',
                        }));
                        serverDraft.clearConflict();
                    }}
                    onDiscard={discardDraftAndEdits}
                    showInfo={false}
                />
            ) : (
                canEditLegalText && <LegalDraftNotice savedAt={savedAt} onDiscard={discardDraftAndEdits} />
            )}
            <M3RichTextEditor
                title={t(titleKey)}
                icon={icon}
                readOnly={!canEditLegalText}
                publishing={isPending || draftActionPending}
                versionLabel={draftVersionLabel}
                versions={editorVersions}
                versionSections={versionSections}
                versionHistoryState={historyState}
                versionHistoryStatusLabel={
                    historyState === 'available' ? undefined : t(VERSION_HISTORY_STATUS_KEYS[historyState])
                }
                // Restore = copy into the active language's draft; the published
                // chain stays append-only.
                onRestoreVersion={
                    canEditLegalText
                        ? (html) => {
                              setEdits((current) => ({ ...current, [activeLanguage]: html }));
                              // Restoring from a section also says what the draft is for.
                              if (versionSections) setPublishIntent(viewedTemplateId ? 'template' : 'live');
                          }
                        : undefined
                }
                onViewVersionChange={(versionId) => {
                    const isTemplate = !!versionId && versionId.startsWith('template:');
                    setViewedTemplateId(isTemplate ? versionId : null);
                    onViewVersionChange(isTemplate ? null : versionId);
                }}
                languages={languages.map((language) => ({
                    value: language,
                    label: t(`language.${language}`),
                }))}
                language={activeLanguage}
                onLanguageChange={setActiveLanguage}
                helpSlot={
                    legalType && <EditorHelpText text={help.text} hint={showHintSnackbar ? undefined : help.hint} />
                }
                // Only hand over a slot when a message is actually showing: the editor reserves
                // bottom space whenever the slot is set, and an empty queue must not leave a gap.
                snackbarSlot={
                    (showDraftSnackbar || showHintSnackbar) && (
                        <EditorSnackbarQueue
                            items={[
                                showDraftSnackbar && {
                                    key: draftSnackbarKey,
                                    node: (
                                        <DraftStatusSnackbar
                                            savedAt={serverBase.draft?.updatedAt}
                                            localSavedAt={savedAt}
                                            onDiscard={discardDraftAndEdits}
                                            onClose={() => setClosedDraftSnackbar(draftSnackbarKey)}
                                        />
                                    ),
                                },
                                showHintSnackbar && {
                                    key: 'help-hint',
                                    node: (
                                        <EditorHintSnackbar
                                            text={help.hint}
                                            onClose={() => {
                                                if (legalType && dismissalScope)
                                                    persistHintClosedForSession(legalType, dismissalScope);
                                                setHintHidden(true);
                                            }}
                                            onDismiss={() => {
                                                if (legalType && dismissalScope)
                                                    persistHintDismissed(legalType, dismissalScope);
                                                setHintHidden(true);
                                            }}
                                        />
                                    ),
                                },
                            ]}
                        />
                    )
                }
                aboveEditorSlot={!legalType && subTitle ? <p className={styles.description}>{subTitle}</p> : undefined}
                placeholder={t(placeHolderKey)}
                placeholders={placeholders}
                value={contentByLanguage[activeLanguage] ?? ''}
                onChange={
                    canEditLegalText
                        ? (html) => setEdits((current) => ({ ...current, [activeLanguage]: html }))
                        : undefined
                }
                onPublish={showLiveAction ? onPublish : undefined}
                publishLabel={versionSections ? t(`legal.publishAction.${liveLevelKey}.${documentKey}`) : undefined}
                dirty={hasUnsavedChanges}
                onSaveDraft={
                    canEditLegalText && legalType && !serverDraft.isError && !serverDraft.hasConflict && sourceChosen
                        ? onSaveDraft
                        : undefined
                }
                onPublishTemplate={showTemplateAction ? onPublishTemplate : undefined}
                publishTemplateDisabledReason={showTemplateAction ? templateBlockedReason : undefined}
                actionsLeading={
                    consentEnabled ? (
                        <LegalConsentField
                            language={activeLanguage}
                            readOnly={consentReadOnly}
                            value={consentDisplay[activeLanguage] ?? ''}
                            onChange={(next) => setConsentEdits((current) => ({ ...current, [activeLanguage]: next }))}
                        />
                    ) : undefined
                }
                belowSlot={
                    showConfirmationModal &&
                    modalVisible && <Modal {...showConfirmationModal} onConfirm={onConfirm} onClose={onCancel} />
                }
            />
            {templateDialogOpen && savedServerDraft && legalType && templateLevel && (
                <SendLegalTemplateDialog
                    level={templateLevel}
                    kind={legalType === 'imprint' ? 'IMPRINT' : 'PRIVACY'}
                    draftRevision={savedServerDraft.revision}
                    draftSavedAt={savedServerDraft.updatedAt}
                    onClose={() => setTemplateDialogOpen(false)}
                />
            )}
            {/* A history that failed to load is not an empty history. Saying "no
                version published yet" for a 403 or a 500 would be a false answer to
                the exact question the look-back exists for. Editing stays possible. */}
            {versionsUnavailable && (
                <Alert
                    type="warning"
                    showIcon
                    data-testid="legal-versions-unavailable"
                    message={t('legal.versions.unavailable.title')}
                    description={t('legal.versions.unavailable.description')}
                />
            )}
            {/* Shown while ANY authored language is affected, not only after a failed
                publish attempt: the rule arrived after texts were live, so a stored
                sentence can be blocking on open — possibly in a language other than
                the one on screen. */}
            {blockedLanguages.length > 0 && (
                <Alert
                    type="error"
                    showIcon
                    data-testid="consent-publish-blocked"
                    message={t('legal.consent.publishBlocked.title')}
                    description={
                        <>
                            {t('legal.consent.publishBlocked.description', { languages: blockedLanguageNames })}{' '}
                            {/* Composed in JSX, never interpolated — i18next would eat it. */}
                            <code>{`{{${MANDATORY_CONSENT_TOKEN}}}`}</code>
                        </>
                    }
                />
            )}
        </div>
    );
};
