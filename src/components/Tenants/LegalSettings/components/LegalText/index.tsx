import set from 'lodash.set';
import { Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalProps } from '../../../../Modal';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../FormPluginEditor/EditorHelpText';
import { EditorHintSnackbar } from '../../../../FormPluginEditor/EditorHintSnackbar';
import { useLegalHelp } from '../../hooks/useLegalHelp';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { LegalDraftNotice } from '../LegalDraftNotice';
import { isEmptyLegalContent } from '../../utils/legalHelpTexts';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { useUserData } from '../../../../../hooks/useUserData.hook';
import styles from './styles.module.scss';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';

// Hint snackbar dismissal: "Nicht mehr anzeigen" persists; X is session-only.
const hintDismissedKey = (type: 'privacy' | 'imprint') => `oriso-admin.legal.${type}.hint.dismissed`;
const hintSessionKey = (type: 'privacy' | 'imprint') => `oriso-admin.legal.${type}.hint.closed`;

const scopedKey = (key: string, scope: string) => `${key}.${scope}`;

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
    fieldName,
    titleKey,
    legalType,
    subTitle,
    placeHolderKey,
    icon,
    showConfirmationModal,
    placeholders,
}: LegalTextProps) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const { data, isLoading, mutate: updateTenant, isPending } = useTenantAppearanceFormData(`${tenantId}`);
    const { data: userData } = useUserData();
    // Persist dismissal only once the opaque user id is known (same pattern as DPA).
    const dismissalScope = userData?.id ? `${tenantId}:${userData.id}` : undefined;
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [pendingFormData, setPendingFormData] = useState<Record<string, unknown>>();
    const [modalVisible, setModalVisible] = useState(false);
    const [hintHidden, setHintHidden] = useState(() =>
        legalType && dismissalScope ? isHintDismissed(legalType, dismissalScope) : false,
    );

    const languages = useMemo(() => {
        const configured = data?.settings?.activeLanguages;
        return configured && configured.length > 0 ? configured : ['de'];
    }, [data?.settings?.activeLanguages]);

    const editorIdentity = `${tenantId}:${fieldName.join('.')}`;
    useEffect(() => {
        setEdits({});
        setPendingFormData(undefined);
        setModalVisible(false);
        setActiveLanguage('de');
    }, [editorIdentity]);

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

    // Writing here publishes straight to the live text, so the admin needs somewhere to
    // park unfinished wording. Until the backend has draft state this is device-local —
    // LegalDraftNotice says so. Without a legalType (no card identity) there is no draft.
    const { draft, savedAt, saveDraft, discardDraft } = useLegalDraft(
        legalType ?? 'privacy',
        legalType ? dismissalScope : undefined,
    );

    // The complete language map: stored languages (unknown keys included), then the
    // saved draft, then this session's edits on top. Legacy plain-string content has no
    // language split — keep it under the first configured language so it is shown and
    // preserved on publish (otherwise an untouched card would overwrite the stored
    // string with {}).
    const contentByLanguage = useMemo<Record<string, string>>(() => {
        let base: Record<string, string> = {};
        if (storedContent && typeof storedContent === 'object') {
            base = storedContent as Record<string, string>;
        } else if (typeof storedContent === 'string' && storedContent !== '') {
            base = { [languages[0]]: storedContent };
        }
        // A viewer who may not edit must never see unpublished local content: the
        // draft notice and its discard action are hidden for them, so they could
        // neither recognise nor remove it. Show the published text only.
        if (!canEditLegalText) {
            return base;
        }
        return { ...base, ...(draft?.content ?? {}), ...edits };
    }, [canEditLegalText, storedContent, draft, edits, languages]);

    // Discarding drops the stored draft AND this session's unsaved edits — otherwise the
    // editor would still show the text the admin just asked to throw away.
    const discardDraftAndEdits = useCallback(() => {
        discardDraft();
        setEdits({});
    }, [discardDraft]);

    const help = useLegalHelp(legalType ?? 'privacy', {
        empty: isEmptyLegalContent(storedContent),
        readOnly: !canEditLegalText,
    });

    useEffect(() => {
        setHintHidden(legalType && dismissalScope ? isHintDismissed(legalType, dismissalScope) : false);
    }, [legalType, dismissalScope]);

    const showHintSnackbar = !!legalType && !hintHidden;

    // A published text supersedes the draft it came from — keeping it would offer the
    // admin a "restore" of what is already live.
    const publishedOptions = useMemo(() => ({ onSuccess: () => discardDraft() }), [discardDraft]);

    const onConfirm = useCallback(() => {
        updateTenant(set(pendingFormData, showConfirmationModal.field, false), publishedOptions);
        setModalVisible(false);
    }, [pendingFormData, publishedOptions, showConfirmationModal, updateTenant]);

    const onCancel = useCallback(() => {
        updateTenant(set(pendingFormData, showConfirmationModal.field, true), publishedOptions);
        setModalVisible(false);
    }, [pendingFormData, publishedOptions, showConfirmationModal, updateTenant]);

    const onPublish = useCallback(() => {
        // The COMPLETE map goes out — languages the admin did not touch survive.
        const formData = set({}, fieldName, { ...contentByLanguage });
        if (showConfirmationModal) {
            setPendingFormData(formData);
            setModalVisible(true);
        } else {
            updateTenant(formData, publishedOptions);
        }
    }, [contentByLanguage, fieldName, publishedOptions, showConfirmationModal, updateTenant]);

    const onSaveDraft = useCallback(() => saveDraft({ ...contentByLanguage }), [contentByLanguage, saveDraft]);

    if (isLoading) {
        return (
            <div className={styles.card}>
                <Spin />
            </div>
        );
    }

    return (
        <div className={styles.card}>
            {canEditLegalText && <LegalDraftNotice savedAt={savedAt} onDiscard={discardDraftAndEdits} />}
            <M3RichTextEditor
                title={t(titleKey)}
                icon={icon}
                readOnly={!canEditLegalText}
                publishing={isPending}
                versionLabel={t('legal.m3Editor.versionLabel')}
                languages={languages.map((language) => ({
                    value: language,
                    label: t(`language.${language}`),
                }))}
                language={activeLanguage}
                onLanguageChange={setActiveLanguage}
                helpSlot={
                    legalType && <EditorHelpText text={help.text} hint={showHintSnackbar ? undefined : help.hint} />
                }
                snackbarSlot={
                    showHintSnackbar && (
                        <EditorHintSnackbar
                            text={help.hint}
                            onClose={() => {
                                if (legalType && dismissalScope) persistHintClosedForSession(legalType, dismissalScope);
                                setHintHidden(true);
                            }}
                            onDismiss={() => {
                                if (legalType && dismissalScope) persistHintDismissed(legalType, dismissalScope);
                                setHintHidden(true);
                            }}
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
                onPublish={canEditLegalText ? onPublish : undefined}
                onSaveDraft={canEditLegalText && legalType ? onSaveDraft : undefined}
                belowSlot={
                    showConfirmationModal &&
                    modalVisible && <Modal {...showConfirmationModal} onConfirm={onConfirm} onClose={onCancel} />
                }
            />
        </div>
    );
};
