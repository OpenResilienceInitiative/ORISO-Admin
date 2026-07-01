import { useState } from 'react';
import { Button, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
import styles from './styles.module.scss';

export type DepartmentPublicationStatus = 'DRAFT' | 'PUBLISHED';

interface DepartmentDataProtectionCardProps {
    /** Name of the Fachbereich (topic) this data privacy policy belongs to — shown in the header. */
    departmentName?: string;
    /** Current stored content (HTML) to edit. */
    initialContent?: string;
    /** Current publication status of the department's data privacy policy. */
    publicationStatus?: DepartmentPublicationStatus;
    /** Persist the edited HTML: publish=true finalises it, publish=false stores a draft. */
    onSave: (content: string, publish: boolean) => void;
    saving?: boolean;
}

/**
 * Editor card for a department's (Fachbereich = agency × topic) own data privacy policy
 * (Datenschutzerklärung). Mirrors the tenant DPA card but is per-Fachbereich: it has no version
 * history and offers both a draft-save and a publish action, with the current status shown as a tag.
 */
export const DepartmentDataProtectionCard = ({
    departmentName,
    initialContent = '',
    publicationStatus = 'DRAFT',
    onSave,
    saving,
}: DepartmentDataProtectionCardProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(initialContent);
    const published = publicationStatus === 'PUBLISHED';

    return (
        <Card titleKey="tenants.legal.departmentDataProtection.title" variant="dialog">
            <div className={styles.header}>
                {departmentName && <span className={styles.department}>{departmentName}</span>}
                <Tag color={published ? 'green' : 'default'}>
                    {published
                        ? t('tenants.legal.departmentDataProtection.status.published', 'Veröffentlicht')
                        : t('tenants.legal.departmentDataProtection.status.draft', 'Entwurf')}
                </Tag>
            </div>

            <p className={styles.description}>
                {t(
                    'tenants.legal.departmentDataProtection.description',
                    'Eigene Datenschutzerklärung dieses Fachbereichs. Als Entwurf speichern oder für Ratsuchende veröffentlichen.',
                )}
            </p>

            <TiptapEditor value={draft} onChange={setDraft} />

            <Space className={styles.actions}>
                <Button loading={saving} onClick={() => onSave(draft, false)}>
                    {t('tenants.legal.departmentDataProtection.saveDraft', 'Als Entwurf speichern')}
                </Button>
                <Button type="primary" loading={saving} onClick={() => onSave(draft, true)}>
                    {t('tenants.legal.departmentDataProtection.publish', 'Veröffentlichen')}
                </Button>
            </Space>
        </Card>
    );
};

export default DepartmentDataProtectionCard;
