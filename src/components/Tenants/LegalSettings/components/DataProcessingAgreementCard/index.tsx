import { useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
import { LegalVersion, LegalVersionViewer } from '../LegalVersionViewer';
import styles from './styles.module.scss';

interface DataProcessingAgreementCardProps {
    /** The current draft content (HTML) to edit and publish. */
    initialContent?: string;
    /** Previously published versions, newest first — shown read-only in the look-back viewer. */
    versions: LegalVersion[];
    /** Called with the edited HTML when the admin publishes. */
    onPublish: (content: string) => void;
    publishing?: boolean;
}

/**
 * The Auftragsverarbeitungsvertrag (DPA) card: edit the current text in the TipTap editor and
 * publish it, with a read-only "look back" at earlier published versions underneath (pick a
 * version from the select → its text is shown read-only).
 */
export const DataProcessingAgreementCard = ({
    initialContent = '',
    versions,
    onPublish,
    publishing,
}: DataProcessingAgreementCardProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(initialContent);

    return (
        <Card titleKey="tenants.legal.dataProcessingAgreement.title" variant="dialog">
            <p className={styles.description}>{t('tenants.legal.dataProcessingAgreement.description')}</p>

            <TiptapEditor value={draft} onChange={setDraft} />

            <Space className={styles.actions}>
                <Button type="primary" loading={publishing} onClick={() => onPublish(draft)}>
                    {t('tenants.legal.dataProcessingAgreement.publish', 'Veröffentlichen')}
                </Button>
            </Space>

            {versions.length > 0 && (
                <div className={styles.history}>
                    <Typography.Text strong className={styles.historyTitle}>
                        {t('tenants.legal.version.history', 'Frühere Fassungen')}
                    </Typography.Text>
                    <LegalVersionViewer versions={versions} />
                </div>
            )}
        </Card>
    );
};

export default DataProcessingAgreementCard;
