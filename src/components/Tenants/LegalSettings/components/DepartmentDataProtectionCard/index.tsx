import { Alert, Button, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
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
    /** The language shown first (usually the admin's UI language). */
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
}

/**
 * Editor card for a department's (Fachbereich = agency × topic) own data privacy policy
 * (Datenschutzerklärung). Mirrors the tenant DPA card but is per-Fachbereich: it has no version
 * history and offers both a draft-save and a publish action, with the current status shown as a tag.
 * Publishing offers to machine-translate the source text into the other active languages.
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
        <Card titleKey="tenants.legal.departmentDataProtection.title" variant="dialog" className={styles.card}>
            <div className={styles.header}>
                {departmentName && <span className={styles.department}>{departmentName}</span>}
                <Tag color={published ? 'green' : 'default'}>
                    {published
                        ? t('tenants.legal.departmentDataProtection.status.published')
                        : t('tenants.legal.departmentDataProtection.status.draft')}
                </Tag>
            </div>

            <p className={styles.description}>{t('tenants.legal.departmentDataProtection.description')}</p>

            <LegalContentLanguageSelect
                languages={languages}
                value={activeLanguage}
                onChange={setActiveLanguage}
                sourceLanguage={sourceLanguage}
                contentMap={contentMapWithEdits}
            />

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
                <Button loading={saving} onClick={() => onSave(buildPublishMap(), false)}>
                    {t('tenants.legal.departmentDataProtection.saveDraft')}
                </Button>
                <Button type="primary" loading={saving} onClick={requestPublish}>
                    {t('tenants.legal.departmentDataProtection.publish')}
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
        </Card>
    );
};

export default DepartmentDataProtectionCard;
