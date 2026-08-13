import { Alert, Button, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { GdprIcon, ImprintIcon } from '../../../../CustomIcons/LegalIcons';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { TranslateOnPublishModal } from '../TranslateOnPublishModal';
import { useLegalContentTranslation } from '../../hooks/useLegalContentTranslation';
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
    /** Explicit override of the language shown first; defaults to the legal source language. */
    defaultLanguage?: string;
    /** Current publication status of the department's data privacy policy. */
    publicationStatus?: DepartmentPublicationStatus;
    /**
     * Persist the edited content: publish=true finalises it, publish=false stores a draft.
     * Always receives the COMPLETE merged content map — loaded content plus the edited
     * languages — so languages the admin did not touch are never dropped.
     */
    onSave: (contentByLanguage: Record<string, string>, publish: boolean) => void;
    saving?: boolean;
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
}: DepartmentDataProtectionCardProps) => {
    const { t } = useTranslation();
    const published = publicationStatus === 'PUBLISHED';
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
        onPublish: (contentByLanguage) => onSave(contentByLanguage, true),
    });

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
                onPublish={() => requestPublish()}
                onSaveDraft={() => onSave(buildPublishMap(), false)}
                belowSlot={
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
                }
            />
        </div>
    );
};

export default DepartmentDataProtectionCard;
