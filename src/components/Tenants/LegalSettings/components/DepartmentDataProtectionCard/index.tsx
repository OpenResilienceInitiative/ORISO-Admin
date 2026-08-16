import { useMemo, useState } from 'react';
import { Alert, Button, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { GdprIcon, ImprintIcon } from '../../../../CustomIcons/LegalIcons';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { LegalConsentField } from '../LegalConsentField';
import { PublishSourceWarningModal } from '../PublishSourceWarningModal';
import { TranslateOnPublishModal } from '../TranslateOnPublishModal';
import { useLegalContentTranslation } from '../../hooks/useLegalContentTranslation';
import { consentPublicationBlockers, MANDATORY_CONSENT_TOKEN } from '../../utils/consentTextValidation';
import { toEditorVersions } from '../../utils/legalVersionOptions';
import { LegalTextVersion } from '../../../../../types/legalVersion';
import { TranslateRequest, TranslateResponse } from '../../../../../types/translation';
import styles from './styles.module.scss';

export type DepartmentPublicationStatus = 'DRAFT' | 'PUBLISHED';

interface DepartmentDataProtectionCardProps {
    /** Name of the Fachbereich (topic) this data privacy policy belongs to — shown in the header. */
    departmentName?: string;
    /** The complete stored content map (language -> HTML), including keys we do not render. */
    initialContentByLanguage?: Record<string, string>;
    /** The languages offered for editing (tenant's active languages + stored ones). */
    languages?: string[];
    /**
     * Explicit override of the language shown first; defaults to the legal source
     * language, or to the first offered language when the source is not offered.
     */
    defaultLanguage?: string;
    /** Current publication status of the department's data privacy policy. */
    publicationStatus?: DepartmentPublicationStatus;
    /**
     * Persist the edited content: publish=true finalises it, publish=false stores a draft.
     * Always receives the COMPLETE merged content map — loaded content plus the edited
     * languages — so languages the admin did not touch are never dropped. The third
     * argument carries the consent sentences when the card edits them (see
     * `consentByLanguage`); it is `undefined` whenever the consent field is not shown.
     */
    onSave: (
        contentByLanguage: Record<string, string>,
        publish: boolean,
        consentByLanguage?: Record<string, string>,
    ) => void;
    saving?: boolean;
    /**
     * Previously published versions of THIS text, newest first (ADR-021 decision 3) —
     * browsable read-only through the editor's version select. Empty while the
     * AgencyService history endpoints of #250 are not deployed yet.
     */
    versions?: LegalTextVersion[];
    /**
     * The consent sentences (language → sentence) stored with this data-protection
     * policy. `undefined` means the backend does not carry the field yet, and the
     * consent editor is not offered at all — the DPP card behaves exactly as before.
     * ADR-021 decision 4: the consent text is a FIELD of the policy, so it lives in
     * this card and is published with it.
     */
    consentByLanguage?: Record<string, string>;
    /**
     * Machine-translation call (wired by the container). When present, publishing offers
     * the translate-on-publish modal and non-source languages get a per-field
     * "translate from the original" button. Draft saves never translate.
     */
    onTranslate?: (request: TranslateRequest) => Promise<TranslateResponse>;
    /** Selects the legal document presentation while retaining the shared publication workflow. */
    documentType?: 'privacy' | 'imprint';
    /**
     * Fachbereich switcher for the editor's lower function bar, between language and version
     * (Figma 1261:52149). Absent when the card edits a single fixed department.
     */
    departmentSlot?: React.ReactNode;
}

/**
 * Editor card for a department's (Fachbereich = agency × topic) own data privacy policy
 * (Datenschutzerklärung) in the M3 editor shell. Mirrors the tenant DPA card but is
 * per-Fachbereich: it has no version history and offers both a draft-save and a publish
 * action, with the current status shown as a tag. Publishing offers to machine-translate
 * the source text into the other active languages.
 */
export const DepartmentDataProtectionCard = ({
    departmentName,
    initialContentByLanguage = {},
    languages = ['de'],
    defaultLanguage,
    publicationStatus = 'DRAFT',
    onSave,
    saving,
    onTranslate,
    documentType = 'privacy',
    departmentSlot,
    versions = [],
    consentByLanguage,
}: DepartmentDataProtectionCardProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language?.split('-')[0] || 'de';
    const published = publicationStatus === 'PUBLISHED';
    // The consent sentence belongs to the policy, never to the imprint (ADR-021
    // decision 7 — the imprint is an information duty and never a consent gate).
    const consentEnabled = documentType === 'privacy' && consentByLanguage !== undefined;
    const [consentEdits, setConsentEdits] = useState<Record<string, string>>({});
    const [publishBlocked, setPublishBlocked] = useState(false);
    const consentMap = useMemo(
        () => ({ ...(consentByLanguage ?? {}), ...consentEdits }),
        [consentByLanguage, consentEdits],
    );
    const blockedLanguages = useMemo(
        () => (consentEnabled ? consentPublicationBlockers(consentMap) : []),
        [consentEnabled, consentMap],
    );
    const {
        activeLanguage,
        setActiveLanguage,
        currentContent,
        sourceLanguage,
        targetLanguages,
        contentMapWithEdits,
        handleEditorChange,
        buildPublishMap,
        requestPublish,
        sourceWarningOpen,
        editedNonSourceLanguages,
        confirmSourceWarning,
        cancelSourceWarning,
        modalOpen,
        closeModal,
        translating,
        modalErrorKey,
        translateAndPublish,
        publishWithoutTranslation,
        showFieldTranslate,
        fieldTranslateDisabled,
        fieldTranslating,
        fieldErrorKey,
        translateActiveField,
    } = useLegalContentTranslation({
        initialContentByLanguage,
        languages,
        defaultLanguage,
        onTranslate,
        // The third argument is passed ONLY when this card owns the consent field —
        // a consumer without it must not be handed an `undefined` consent map it
        // would then have to distinguish from "cleared".
        onPublish: (contentByLanguage) =>
            consentEnabled ? onSave(contentByLanguage, true, consentMap) : onSave(contentByLanguage, true),
    });

    const editorVersions = useMemo(
        () => toEditorVersions(versions, activeLanguage, locale, t('tenants.legal.version.current')),
        [versions, activeLanguage, locale, t],
    );

    /**
     * Publishing is refused while an authored consent sentence lacks
     * `{{legal_links}}` (ADR-021 decision 2). The server rejects it too — running
     * the same check here means the admin is told which languages are affected
     * instead of losing the round trip to a generic 400.
     */
    const handlePublish = () => {
        if (blockedLanguages.length > 0) {
            setPublishBlocked(true);
            return;
        }
        setPublishBlocked(false);
        requestPublish();
    };

    return (
        <div className={styles.card}>
            <M3RichTextEditor
                title={t(
                    documentType === 'imprint'
                        ? 'tenants.legal.departmentImprint.title'
                        : 'tenants.legal.departmentDataProtection.title',
                )}
                icon={documentType === 'imprint' ? ImprintIcon : GdprIcon}
                value={currentContent}
                onChange={handleEditorChange}
                publishing={saving}
                versionLabel={t('legal.m3Editor.versionLabel')}
                versions={editorVersions}
                // Restore = copy: the version's text becomes the active language's
                // draft; the published chain stays append-only and untouched.
                onRestoreVersion={handleEditorChange}
                languageSlot={
                    <LegalContentLanguageSelect
                        languages={languages}
                        value={activeLanguage}
                        onChange={setActiveLanguage}
                        sourceLanguage={sourceLanguage}
                        contentMap={contentMapWithEdits}
                    />
                }
                topicSlot={departmentSlot}
                helpSlot={
                    <>
                        <div className={styles.header}>
                            {departmentName && <span className={styles.department}>{departmentName}</span>}
                            <Tag color={published ? 'green' : 'default'}>
                                {published
                                    ? t('tenants.legal.departmentDataProtection.status.published')
                                    : t('tenants.legal.departmentDataProtection.status.draft')}
                            </Tag>
                        </div>
                        <p className={styles.description}>
                            {t(
                                documentType === 'imprint'
                                    ? 'tenants.legal.departmentImprint.description'
                                    : 'tenants.legal.departmentDataProtection.description',
                            )}
                        </p>
                    </>
                }
                aboveEditorSlot={
                    showFieldTranslate && (
                        <div className={styles.translateField}>
                            <Button
                                size="small"
                                loading={fieldTranslating}
                                disabled={fieldTranslateDisabled}
                                onClick={translateActiveField}
                            >
                                {t('legal.translation.field.button')}
                            </Button>
                            {fieldErrorKey && (
                                <Alert type="error" showIcon message={t(fieldErrorKey)} className={styles.fieldError} />
                            )}
                        </div>
                    )
                }
                onPublish={handlePublish}
                onSaveDraft={() =>
                    consentEnabled ? onSave(buildPublishMap(), false, consentMap) : onSave(buildPublishMap(), false)
                }
                belowSlot={
                    <>
                        <PublishSourceWarningModal
                            open={sourceWarningOpen}
                            sourceLanguage={sourceLanguage}
                            editedLanguages={editedNonSourceLanguages}
                            onConfirm={confirmSourceWarning}
                            onCancel={cancelSourceWarning}
                        />
                        <TranslateOnPublishModal
                            open={modalOpen}
                            sourceLanguage={sourceLanguage}
                            targetLanguages={targetLanguages}
                            translating={translating}
                            errorKey={modalErrorKey}
                            onConfirm={translateAndPublish}
                            onSkip={publishWithoutTranslation}
                            onCancel={closeModal}
                        />
                    </>
                }
            />
            {/* The consent sentence sits UNDER the editor, not in its `belowSlot`:
                the M3 card is a fixed 800×740 deck card, so visible content inside
                it is clipped (the same trap the aboveEditorSlot banner hit in #708).
                It stays part of THIS card — one card, policy plus its consent field. */}
            {consentEnabled && (
                <LegalConsentField
                    language={activeLanguage}
                    value={consentMap[activeLanguage] ?? ''}
                    onChange={(next) => {
                        setPublishBlocked(false);
                        setConsentEdits((current) => ({ ...current, [activeLanguage]: next }));
                    }}
                />
            )}
            {publishBlocked && (
                <Alert
                    type="error"
                    showIcon
                    data-testid="consent-publish-blocked"
                    message={t('legal.consent.publishBlocked.title')}
                    description={
                        <>
                            {t('legal.consent.publishBlocked.description', {
                                languages: blockedLanguages.join(', '),
                            })}{' '}
                            <code>{`{{${MANDATORY_CONSENT_TOKEN}}}`}</code>
                        </>
                    }
                />
            )}
        </div>
    );
};

export default DepartmentDataProtectionCard;
