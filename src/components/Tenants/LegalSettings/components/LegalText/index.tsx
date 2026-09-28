import set from 'lodash.set';
import { Alert, notification, Spin, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalProps } from '../../../../Modal';
import { legalTextTokensFor } from '../../../../PlaceholderTemplate/placeholderTokens';
import { EditorVersionSection, M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../FormPluginEditor/EditorHelpText';
import { EditorHintSnackbar } from '../../../../FormPluginEditor/EditorHintSnackbar';
import { useLegalHelp } from '../../hooks/useLegalHelp';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { useLegalTextReadOnlyReason } from '../../hooks/useLegalTextReadOnlyReason';
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
import type { LegalProposalAdoptionMode } from '../../../../../api/tenant/legalProposals';
import { LegalTemplateCompare } from '../LegalTemplateCompare';
import type { TenantTemplateInbox } from '../../hooks/useLegalProposalInbox';

// Hint snackbar dismissal: "Nicht mehr anzeigen" persists; X is session-only.
const hintDismissedKey = (type: 'privacy' | 'imprint') => `oriso-admin.legal.${type}.hint.dismissed`;
const hintSessionKey = (type: 'privacy' | 'imprint') => `oriso-admin.legal.${type}.hint.closed`;

const scopedKey = (key: string, scope: string) => `${key}.${scope}`;

// Admins read publication times in the platform's legal time zone, not the browser's.
const formatPublishedAt = (iso: string, locale: string) => {
    const date = parseUtcTimestamp(iso);
    return Number.isNaN(date.getTime())
        ? iso
        : new Intl.DateTimeFormat(locale, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Berlin',
          }).format(date);
};

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
     * Lets a Träger forward its saved draft to its own Beratungsstellen as a template — the
     * rung below the platform's (OpenResilienceInitiative/ORISO-AgencyService#303).
     */
    offerTemplatesToAgencies?: boolean;
    /**
     * Templates the platform sent to this Träger (#1070). When set, a received template is
     * shown read-only beside the own draft, with adopt and dismiss.
     */
    templateInbox?: TenantTemplateInbox;
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
}

/**
 * Imprint / privacy card in the M3 editor shell (Figma Admin.ORISO 1-53274).
 * The M3RichTextEditor is the editing engine (per active language, incl. the
 * placeholder dropdown and anchor navigation); local edits are kept per language
 * and publishing sends the COMPLETE language map through the tenant-admin
 * mutation — untouched languages and unknown stored keys are never dropped.
 * The optional confirmation modal (privacy) stays in front of the save.
 */
export type LegalTextComponentProps = LegalTextProps;

export const LegalText = ({
    tenantId,
    draftTenantId,
    offerTemplatesToAgencies = false,
    templateInbox,
    fieldName,
    titleKey,
    legalType,
    subTitle,
    placeHolderKey,
    icon,
    showConfirmationModal,
}: LegalTextProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language?.split('-')[0] || 'de';
    const { can } = useUserPermissions();
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const readOnlyReason = useLegalTextReadOnlyReason();
    // The card confirms a publish itself ("Veröffentlicht"); the generic settings toast would be a second one.
    const {
        data,
        isLoading,
        mutateAsync: updateTenantAsync,
        isPending,
    } = useTenantAppearanceFormData(`${tenantId}`, { successMessageKey: null });
    const { data: userData, isLoading: isUserLoading } = useUserData();
    // Persist dismissal only once the opaque user id is known (same pattern as DPA).
    const dismissalScope = userData?.id ? `${tenantId}:${userData.id}` : undefined;
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    // Closing the draft snackbar hides it for THIS saved version; a newer save shows it again.
    const [closedDraftSnackbar, setClosedDraftSnackbar] = useState<string | undefined>();
    const [consentBlockedClosed, setConsentBlockedClosed] = useState<string | undefined>();
    const [modalVisible, setModalVisible] = useState(false);
    // What this session just published, until the tenant re-read replaces `data`: without it the
    // card flipped back to the old text for a moment and read as "nothing was saved" (#1066).
    const [justPublished, setJustPublished] = useState<{
        identity: string;
        at: string;
        basis: unknown;
        content: Record<string, string>;
        consent?: Record<string, string>;
    }>();
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

    // Version look-back for the Träger/platform text (ADR-021 decision 3, #1070). A TenantService
    // older than #1070 has no collection: that must not be phrased as "never published" or turn
    // the persisted current body into an "Entwurf". A genuine failure (403, 500, network) remains
    // separate from both states.
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
    const publishedNow = justPublished?.identity === editorIdentity ? justPublished : undefined;
    const bridgingPublish = publishedNow && publishedNow.basis === data ? publishedNow : undefined;
    const publishedByLanguage = useMemo<Record<string, string>>(() => {
        if (bridgingPublish) return bridgingPublish.content;
        if (storedContent && typeof storedContent === 'object') return storedContent as Record<string, string>;
        if (typeof storedContent === 'string' && storedContent !== '') return { [languages[0]]: storedContent };
        return {};
    }, [bridgingPublish, storedContent, languages]);
    const contentByLanguage = useMemo<Record<string, string>>(() => {
        const base = publishedByLanguage;
        // A viewer who may not edit must never see unpublished local content: the
        // draft notice and its discard action are hidden for them, so they could
        // neither recognise nor remove it. Show the published text only.
        if (!canEditLegalText) {
            return base;
        }
        // A saved server draft is a complete snapshot: a language it no longer has stays gone.
        // A device-local draft may hold only the languages that were edited, so it still layers.
        if (sourceChosen && selectedDraft && draftSource !== 'local' && serverBase.draft === selectedDraft) {
            return { ...selectedDraft.content, ...edits };
        }
        return { ...base, ...(sourceChosen ? selectedDraft?.content ?? {} : {}), ...edits };
    }, [canEditLegalText, publishedByLanguage, sourceChosen, selectedDraft, draftSource, serverBase.draft, edits]);

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
    const publishedConsent = useMemo<Record<string, string>>(() => {
        if (bridgingPublish?.consent) return bridgingPublish.consent;
        return storedConsent && typeof storedConsent === 'object' ? (storedConsent as Record<string, string>) : {};
    }, [bridgingPublish, storedConsent]);
    const consentByLanguage = useMemo<Record<string, string>>(() => {
        const base = publishedConsent;
        // Same rule as the policy body: a viewer who may not edit sees the published
        // sentence only — they can neither recognise nor discard a local draft.
        if (!canEditLegalText) {
            return base;
        }
        if (
            sourceChosen &&
            selectedDraft?.privacyConsent &&
            draftSource !== 'local' &&
            serverBase.draft === selectedDraft
        ) {
            return { ...selectedDraft.privacyConsent, ...consentEdits };
        }
        return {
            ...base,
            ...(sourceChosen ? selectedDraft?.privacyConsent ?? {} : {}),
            ...consentEdits,
        };
    }, [canEditLegalText, publishedConsent, sourceChosen, selectedDraft, draftSource, serverBase.draft, consentEdits]);
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

    const legalTextTokens = useMemo(
        () =>
            legalTextTokensFor(legalType, isPlatformDraft ? 'platform' : 'traeger').map((token) => ({
                key: token.key,
                label: t(token.labelKey, token.labelFallback),
                sample: token.sample,
            })),
        [t, legalType, isPlatformDraft],
    );

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
            // The server draft is gone once the delete succeeded, whatever happens locally next;
            // keeping it would advertise a deleted draft and send its dead revision on the next save.
            if (editorIdentityRef.current === operationIdentity) {
                setServerBaseState({ identity: operationIdentity, draft: null, revision: 'new' });
            }
            const localDiscarded = discardDraft();
            if (editorIdentityRef.current === operationIdentity && localDiscarded) {
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

    const saveCurrentDraft = useCallback(
        async ({ announce = true }: { announce?: boolean } = {}) => {
            const saved = await serverDraft.save({
                content: { ...contentByLanguage },
                ...(consentEnabled ? { privacyConsent: { ...consentByLanguage } } : {}),
                revision: serverBase.revision ?? 'new',
            });
            discardDraft();
            if (editorIdentityRef.current === editorIdentity) {
                setServerBaseState({ identity: editorIdentity, draft: saved, revision: saved.revision });
                setDraftSource('server');
                // Publishing saves first; there the "Veröffentlicht" toast is the one answer.
                if (announce) notification.success({ message: t('legal.serverDraft.saved'), duration: 4 });
            }
            return saved;
        },
        [
            consentByLanguage,
            consentEnabled,
            contentByLanguage,
            discardDraft,
            editorIdentity,
            serverBase.revision,
            serverDraft,
            t,
        ],
    );

    // Saves and publishes in one go. Runs only after the admin answered "Ratsuchende informieren?"
    // (where asked): dismissing that question must leave nothing saved and nothing published.
    const publishNow = useCallback(
        async (confirmPrivacy?: boolean) => {
            const operationIdentity = editorIdentity;
            const basis = data;
            setDraftActionPending(true);
            let saved;
            try {
                saved = await saveCurrentDraft({ announce: false });
            } catch {
                notification.error({ message: t('legal.serverDraft.saveError'), duration: 8 });
                setDraftActionPending(false);
                return;
            }
            if (editorIdentityRef.current !== operationIdentity) return;
            // Publish exactly the normalized payload returned by the revision-checked
            // draft write. This keeps the live text and the saved revision identical.
            const formData = set({}, fieldName, { ...saved.content });
            // The draft PUT may not echo the optional consent map; the one sent is then authoritative.
            const publishedConsentMap = consentEnabled ? { ...(saved.privacyConsent ?? consentByLanguage) } : undefined;
            if (publishedConsentMap) set(formData, ['content', 'privacyConsent'], publishedConsentMap);
            if (showConfirmationModal && confirmPrivacy !== undefined) {
                set(formData, showConfirmationModal.field, confirmPrivacy);
            }
            try {
                await publishSavedDraft(formData, saved.revision, operationIdentity);
                if (editorIdentityRef.current === operationIdentity) {
                    setJustPublished({
                        identity: operationIdentity,
                        at: new Date().toISOString(),
                        basis,
                        content: { ...saved.content },
                        consent: publishedConsentMap,
                    });
                    notification.success({ message: t('legal.published.toast'), duration: 4 });
                }
            } catch {
                notification.error({ message: t('legal.serverDraft.publishError'), duration: 8 });
            } finally {
                if (editorIdentityRef.current === operationIdentity) setDraftActionPending(false);
            }
        },
        [
            consentByLanguage,
            consentEnabled,
            data,
            editorIdentity,
            fieldName,
            publishSavedDraft,
            saveCurrentDraft,
            showConfirmationModal,
            t,
        ],
    );

    const onPublish = useCallback(() => {
        // Refuse before the request: an authored consent sentence without
        // `{{legal_links}}` is rejected server-side (ADR-021 decision 2), and the
        // admin should learn that from the editor, not from a failed publish.
        if (blockedLanguages.length > 0) {
            return;
        }
        if (showConfirmationModal) {
            setModalVisible(true);
            return;
        }
        publishNow();
    }, [blockedLanguages, publishNow, showConfirmationModal]);

    const answerConfirmation = useCallback(
        (confirmPrivacy: boolean) => {
            setModalVisible(false);
            publishNow(confirmPrivacy);
        },
        [publishNow],
    );

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

    // The card's persistent answer to "is this online?" (#1066): shown only while the screen holds
    // exactly the live text. The date is known right after a publish or from the version history.
    const isPublished = !differsFromPublished && !isEmptyLegalContent(publishedByLanguage);
    const publishedAt =
        publishedNow?.at ??
        (historyState === 'available' ? versions?.find((version) => !version.supersededAt)?.publishedAt : undefined);
    const publicationStatus = isPublished && (
        <div className={styles.publicationStatus}>
            <Tag color="green" data-testid="legal-publication-status">
                {publishedAt ? (
                    <>
                        {t('legal.status.publishedAt')}{' '}
                        <time dateTime={publishedAt}>{formatPublishedAt(publishedAt, locale)}</time>
                    </>
                ) : (
                    t('legal.status.published')
                )}
            </Tag>
        </div>
    );
    // A Träger admin blocked by the platform-wide switch learns that, and who can lift it.
    const helpText = !canEditLegalText && readOnlyReason.platformLock ? t(readOnlyReason.key) : help.text;

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

    // Replacing a draft must never lose typing: unsaved work is saved first, so the archive the
    // server writes on ARCHIVE_AND_REPLACE holds it too.
    const onAdoptTemplate = async (mode: LegalProposalAdoptionMode) => {
        const proposal = templateInbox?.current;
        if (!templateInbox || !proposal) return;
        const operationIdentity = editorIdentity;
        setDraftActionPending(true);
        try {
            let draftRevision = serverBase.draft ? serverBase.revision : undefined;
            if (mode === 'ARCHIVE_AND_REPLACE' && (hasUnsavedChanges || !serverBase.draft)) {
                draftRevision = (await saveCurrentDraft({ announce: false })).revision;
            }
            const adopted = await templateInbox.adopt(proposal, mode, draftRevision);
            discardDraft();
            if (editorIdentityRef.current === operationIdentity) {
                setServerBaseState({ identity: operationIdentity, draft: adopted, revision: adopted.revision });
                setDraftSource('server');
                setEdits({});
                setConsentEdits({});
                notification.success({ message: t('legal.proposal.adopted'), duration: 5 });
            }
        } catch (error) {
            const conflict = error instanceof Error && error.message === 'CONFLICT';
            notification.error({
                message: t(conflict ? 'legal.proposal.error.conflict' : 'legal.proposal.error.adopt'),
                duration: 8,
            });
            // A draft appeared elsewhere meanwhile: re-read it, the next attempt then asks to replace it.
            if (conflict && mode === 'CREATE_IF_EMPTY' && editorIdentityRef.current === operationIdentity) {
                await serverDraft.retry();
                setServerBaseState({ identity: operationIdentity, draft: undefined, revision: undefined });
            }
        } finally {
            if (editorIdentityRef.current === operationIdentity) setDraftActionPending(false);
        }
    };

    const onDismissTemplate = async () => {
        const proposal = templateInbox?.current;
        if (!templateInbox || !proposal) return;
        try {
            await templateInbox.dismiss(proposal);
            notification.success({ message: t('legal.proposal.dismissed'), duration: 4 });
        } catch (error) {
            const conflict = error instanceof Error && error.message === 'CONFLICT';
            notification.error({
                message: t(conflict ? 'legal.proposal.error.conflict' : 'legal.proposal.error.dismiss'),
                duration: 8,
            });
        }
    };

    let adoptBlockedReason: string | undefined;
    if (serverDraft.isError || serverDraft.hasConflict || !sourceChosen) {
        adoptBlockedReason = t('legal.proposal.adoptBlocked.draftChoice');
    }

    const documentKey = legalType ?? 'privacy';
    const liveLevelKey = isPlatformDraft ? 'platform' : 'traeger';
    const formatSentAt = (iso: string) => {
        const date = parseUtcTimestamp(iso);
        return Number.isNaN(date.getTime())
            ? iso
            : new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
    };
    const templateSectionTitle = t(`legal.versionMenu.templates.${documentKey}`);
    // A text published before the history existed has no entry; "nothing published" would be false.
    const liveHistoryEmptyKey = isEmptyLegalContent(publishedByLanguage)
        ? 'legal.m3Editor.versionEmpty'
        : 'legal.versions.noneRecorded';
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
                              ? t(liveHistoryEmptyKey)
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

    const wrapEditor = (editor: React.ReactElement) =>
        templateInbox && legalType ? (
            <LegalTemplateCompare
                proposal={templateInbox.current}
                source="platform"
                documentType={legalType}
                language={activeLanguage}
                hasDraft={!!savedServerDraft || hasUnsavedChanges}
                readOnly={!canEditLegalText}
                readOnlyReason={!canEditLegalText ? t(readOnlyReason.key) : undefined}
                adoptBlockedReason={adoptBlockedReason}
                archives={canEditLegalText ? templateInbox.archives : undefined}
                onAdopt={onAdoptTemplate}
                onDismiss={onDismissTemplate}
            >
                {editor}
            </LegalTemplateCompare>
        ) : (
            editor
        );

    return (
        <div className={styles.card}>
            {canEditLegalText && legalType ? (
                <TenantLegalDraftNotice
                    savedAt={serverBase.draft?.updatedAt}
                    localSavedAt={draftSource === 'server' ? undefined : savedAt}
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
                    pending={draftActionPending}
                />
            ) : (
                canEditLegalText && <LegalDraftNotice savedAt={savedAt} onDiscard={discardDraftAndEdits} />
            )}
            {wrapEditor(
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
                        legalType && (
                            <>
                                {publicationStatus}
                                <EditorHelpText text={helpText} hint={showHintSnackbar ? undefined : help.hint} />
                            </>
                        )
                    }
                    // Only hand over a slot when a message is actually showing: the editor reserves
                    // bottom space whenever the slot is set, and an empty queue must not leave a gap.
                    snackbarSlot={
                        ((blockedLanguages.length > 0 && consentBlockedClosed !== blockedLanguageNames) ||
                            showDraftSnackbar ||
                            showHintSnackbar) && (
                            <EditorSnackbarQueue
                                items={[
                                    // A blocking error outranks the draft notice and the help hint.
                                    blockedLanguages.length > 0 &&
                                        consentBlockedClosed !== blockedLanguageNames && {
                                            key: `consent-blocked:${blockedLanguageNames}`,
                                            node: (
                                                <span data-testid="consent-publish-blocked">
                                                    <EditorHintSnackbar
                                                        tone="error"
                                                        text={t('legal.consent.publishBlocked.description', {
                                                            languages: blockedLanguageNames,
                                                        })}
                                                        onClose={() => setConsentBlockedClosed(blockedLanguageNames)}
                                                    />
                                                </span>
                                            ),
                                        },
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
                    aboveEditorSlot={
                        !legalType && subTitle ? <p className={styles.description}>{subTitle}</p> : undefined
                    }
                    placeholder={t(placeHolderKey)}
                    textTokens={legalTextTokens}
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
                        canEditLegalText &&
                        legalType &&
                        !serverDraft.isError &&
                        !serverDraft.hasConflict &&
                        sourceChosen
                            ? onSaveDraft
                            : undefined
                    }
                    onPublishTemplate={showTemplateAction ? onPublishTemplate : undefined}
                    publishTemplateLabel={templateLevel === 'agencies' ? t('legal.template.forward.action') : undefined}
                    publishTemplateDisabledReason={showTemplateAction ? templateBlockedReason : undefined}
                    actionsLeading={
                        consentEnabled ? (
                            <LegalConsentField
                                language={activeLanguage}
                                readOnly={consentReadOnly}
                                value={consentDisplay[activeLanguage] ?? ''}
                                onChange={(next) =>
                                    setConsentEdits((current) => ({ ...current, [activeLanguage]: next }))
                                }
                            />
                        ) : undefined
                    }
                    // "Ja" informs, "Nein" publishes silently; Escape, X and a click outside answer
                    // neither, so they abort the publish instead of picking one (#1066).
                    belowSlot={
                        showConfirmationModal &&
                        modalVisible && (
                            <Modal
                                {...showConfirmationModal}
                                onConfirm={() => answerConfirmation(true)}
                                onClose={() => answerConfirmation(false)}
                                onDismiss={() => setModalVisible(false)}
                            />
                        )
                    }
                />,
            )}
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
        </div>
    );
};
