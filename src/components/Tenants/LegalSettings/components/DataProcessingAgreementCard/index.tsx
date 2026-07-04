import { Alert, Button, ConfigProvider, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
import { LegalVersion, LegalVersionViewer } from '../LegalVersionViewer';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { TranslateOnPublishModal } from '../TranslateOnPublishModal';
import { useLegalContentTranslation } from '../../hooks/useLegalContentTranslation';
import { TranslateRequest, TranslateResponse } from '../../../../../types/translation';
import styles from './styles.module.scss';

interface DataProcessingAgreementCardProps {
    /** The complete stored content map (language -> HTML), including keys we do not render. */
    initialContentByLanguage?: Record<string, string>;
    /** The languages offered for editing (tenant's active languages + stored ones). */
    languages?: string[];
    /** The language shown first (usually the admin's UI language). */
    defaultLanguage?: string;
    /** Previously published versions, newest first — shown read-only in the look-back viewer. */
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
 * editor and publish the complete language map, with a read-only "look back" at earlier
 * published versions underneath (pick a version from the select → its text is shown read-only).
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

    return (
        <Card titleKey="tenants.legal.dataProcessingAgreement.title" variant="dialog">
            <p className={styles.description}>
                {readOnly
                    ? t('tenants.legal.dataProcessingAgreement.managedByTenant')
                    : t('tenants.legal.dataProcessingAgreement.description')}
            </p>

            <LegalContentLanguageSelect
                languages={languages}
                value={activeLanguage}
                onChange={setActiveLanguage}
                sourceLanguage={sourceLanguage}
                contentMap={contentMapWithEdits}
            />

            {readOnly ? (
                <ConfigProvider componentDisabled>
                    <TiptapEditor key={activeLanguage} value={currentContent} />
                </ConfigProvider>
            ) : (
                <>
                    {showFieldTranslate && (
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
                    )}

                    <TiptapEditor key={activeLanguage} value={currentContent} onChange={handleEditorChange} />

                    <Space className={styles.actions}>
                        <Button type="primary" loading={publishing} onClick={requestPublish}>
                            {t('tenants.legal.dataProcessingAgreement.publish')}
                        </Button>
                    </Space>

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
            )}

            {versions.length > 0 && (
                <div className={styles.history}>
                    <Typography.Text strong className={styles.historyTitle}>
                        {t('tenants.legal.version.history')}
                    </Typography.Text>
                    <LegalVersionViewer versions={versions} />
                </div>
            )}
        </Card>
    );
};

export default DataProcessingAgreementCard;
