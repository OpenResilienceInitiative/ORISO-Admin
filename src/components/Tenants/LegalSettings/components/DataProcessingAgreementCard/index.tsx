import { useMemo } from 'react';
import { Alert, Button } from 'antd';
import { CloudSync } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { EditorVersion, M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { TranslateOnPublishModal } from '../TranslateOnPublishModal';
import { useLegalContentTranslation } from '../../hooks/useLegalContentTranslation';
import { pickLegalContentLanguage } from '../../utils/legalContentLanguages';
import { TranslateRequest, TranslateResponse } from '../../../../../types/translation';
import styles from './styles.module.scss';

export interface LegalVersion {
    /** Stable id for the version — e.g. the activation timestamp in ISO form. */
    id: string;
    /** Human-readable label shown in the editor's version select — e.g. "13. Jul 2026 – 10:22". */
    label: string;
    /**
     * The version's COMPLETE stored content (language -> HTML map, or legacy plain HTML).
     * The card picks the active language per version — never the container, which does
     * not know which language the admin is currently editing.
     */
    content: string;
}

interface DataProcessingAgreementCardProps {
    /** The complete stored content map (language -> HTML), including keys we do not render. */
    initialContentByLanguage?: Record<string, string>;
    /** The languages offered for editing (tenant's active languages + stored ones). */
    languages?: string[];
    /** The language shown first (usually the admin's UI language). */
    defaultLanguage?: string;
    /** Previously published versions, newest first — browsable via the editor's version select. */
    versions: LegalVersion[];
    /**
     * Called with the COMPLETE merged content map when the admin publishes: loaded content
     * plus the edited languages — languages the admin did not touch are never dropped.
     */
    onPublish: (contentByLanguage: Record<string, string>) => void;
    publishing?: boolean;
    /**
     * Machine-translation call (wired by the container). When present, publishing offers
     * the translate-on-publish modal and non-source languages get a per-field
     * "translate from the original" button.
     */
    onTranslate?: (request: TranslateRequest) => Promise<TranslateResponse>;
    /**
     * Read-only mode for the agency page: the DPA is managed at tenant (Träger) level,
     * so agency admins only get to look at the published text, not edit it.
     */
    readOnly?: boolean;
}

/**
 * The Auftragsverarbeitungsvertrag (DPA) card: edit the text per language in the TipTap
 * editor and publish the complete language map. Earlier published versions are browsable
 * read-only via the editor's version select; "restore" copies a version's text into the
 * active language's draft (restore = copy — the version chain stays append-only).
 * Publishing offers to machine-translate the source text into the other active languages.
 */
export const DataProcessingAgreementCard = ({
    initialContentByLanguage = {},
    languages = ['de'],
    defaultLanguage,
    versions,
    onPublish,
    publishing,
    onTranslate,
    readOnly,
}: DataProcessingAgreementCardProps) => {
    const { t } = useTranslation();
    const {
        activeLanguage,
        setActiveLanguage,
        currentContent,
        sourceLanguage,
        targetLanguages,
        contentMapWithEdits,
        handleEditorChange,
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
        onTranslate: readOnly ? undefined : onTranslate,
        onPublish,
    });

    // The editor's version select browses the versions in the ACTIVE language; a version
    // that was never stored in that language falls back to its first stored language
    // rather than showing an empty page.
    const editorVersions: EditorVersion[] = useMemo(
        () =>
            versions.map((version) => ({
                id: version.id,
                label: version.label,
                content: pickLegalContentLanguage(version.content, activeLanguage),
            })),
        [versions, activeLanguage],
    );

    return (
        <div className={styles.card}>
            <M3RichTextEditor
                title={t('tenants.legal.dataProcessingAgreement.title')}
                icon={CloudSync}
                value={currentContent}
                onChange={readOnly ? undefined : handleEditorChange}
                readOnly={readOnly}
                publishing={publishing}
                versionLabel={t('legal.m3Editor.versionLabel')}
                versions={editorVersions}
                // Restore = copy: the version's text becomes the active language's draft;
                // the published version chain stays append-only and untouched.
                onRestoreVersion={readOnly ? undefined : handleEditorChange}
                languageSlot={
                    <LegalContentLanguageSelect
                        languages={languages}
                        value={activeLanguage}
                        onChange={setActiveLanguage}
                        sourceLanguage={sourceLanguage}
                        contentMap={contentMapWithEdits}
                    />
                }
                aboveEditorSlot={
                    <>
                        <p className={styles.description}>
                            {readOnly
                                ? t('tenants.legal.dataProcessingAgreement.managedByTenant')
                                : t('tenants.legal.dataProcessingAgreement.description')}
                        </p>
                        {!readOnly && showFieldTranslate && (
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
                                    <Alert
                                        type="error"
                                        showIcon
                                        message={t(fieldErrorKey)}
                                        className={styles.fieldError}
                                    />
                                )}
                            </div>
                        )}
                    </>
                }
                onPublish={readOnly ? undefined : () => requestPublish()}
                belowSlot={
                    !readOnly && (
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
                    )
                }
            />
        </div>
    );
};

export default DataProcessingAgreementCard;
