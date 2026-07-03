import { useState } from 'react';
import { Button, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { mergeLegalContentMap } from '../../utils/legalContentLanguages';
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
}

/**
 * Editor card for a department's (Fachbereich = agency × topic) own data privacy policy
 * (Datenschutzerklärung). Mirrors the tenant DPA card but is per-Fachbereich: it has no version
 * history and offers both a draft-save and a publish action, with the current status shown as a tag.
 */
export const DepartmentDataProtectionCard = ({
    departmentName,
    initialContentByLanguage = {},
    languages = ['de'],
    defaultLanguage,
    publicationStatus = 'DRAFT',
    onSave,
    saving,
}: DepartmentDataProtectionCardProps) => {
    const { t } = useTranslation();
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [activeLanguage, setActiveLanguage] = useState(
        defaultLanguage && languages.includes(defaultLanguage) ? defaultLanguage : languages[0],
    );
    const published = publicationStatus === 'PUBLISHED';

    const currentContent = edits[activeLanguage] ?? initialContentByLanguage[activeLanguage] ?? '';
    const save = (publish: boolean) => onSave(mergeLegalContentMap(initialContentByLanguage, edits), publish);

    return (
        <Card titleKey="tenants.legal.departmentDataProtection.title" variant="dialog">
            <div className={styles.header}>
                {departmentName && <span className={styles.department}>{departmentName}</span>}
                <Tag color={published ? 'green' : 'default'}>
                    {published
                        ? t('tenants.legal.departmentDataProtection.status.published')
                        : t('tenants.legal.departmentDataProtection.status.draft')}
                </Tag>
            </div>

            <p className={styles.description}>{t('tenants.legal.departmentDataProtection.description')}</p>

            <LegalContentLanguageSelect languages={languages} value={activeLanguage} onChange={setActiveLanguage} />

            <TiptapEditor
                key={activeLanguage}
                value={currentContent}
                onChange={(html) => setEdits((prev) => ({ ...prev, [activeLanguage]: html }))}
            />

            <Space className={styles.actions}>
                <Button loading={saving} onClick={() => save(false)}>
                    {t('tenants.legal.departmentDataProtection.saveDraft')}
                </Button>
                <Button type="primary" loading={saving} onClick={() => save(true)}>
                    {t('tenants.legal.departmentDataProtection.publish')}
                </Button>
            </Space>
        </Card>
    );
};

export default DepartmentDataProtectionCard;
