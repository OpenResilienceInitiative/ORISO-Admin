import { useState } from 'react';
import { Button, ConfigProvider, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
import { LegalVersion, LegalVersionViewer } from '../LegalVersionViewer';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { mergeLegalContentMap } from '../../utils/legalContentLanguages';
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
     * Read-only mode for the agency page: the DPA is managed at tenant (Träger) level,
     * so agency admins only get to look at the published text, not edit it.
     */
    readOnly?: boolean;
}

/**
 * The Auftragsverarbeitungsvertrag (DPA) card: edit the text per language in the TipTap
 * editor and publish the complete language map, with a read-only "look back" at earlier
 * published versions underneath (pick a version from the select → its text is shown read-only).
 */
export const DataProcessingAgreementCard = ({
    initialContentByLanguage = {},
    languages = ['de'],
    defaultLanguage,
    versions,
    onPublish,
    publishing,
    readOnly,
}: DataProcessingAgreementCardProps) => {
    const { t } = useTranslation();
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [activeLanguage, setActiveLanguage] = useState(
        defaultLanguage && languages.includes(defaultLanguage) ? defaultLanguage : languages[0],
    );

    const currentContent = edits[activeLanguage] ?? initialContentByLanguage[activeLanguage] ?? '';

    return (
        <Card titleKey="tenants.legal.dataProcessingAgreement.title" variant="dialog">
            <p className={styles.description}>
                {readOnly
                    ? t('tenants.legal.dataProcessingAgreement.managedByTenant')
                    : t('tenants.legal.dataProcessingAgreement.description')}
            </p>

            <LegalContentLanguageSelect languages={languages} value={activeLanguage} onChange={setActiveLanguage} />

            {readOnly ? (
                <ConfigProvider componentDisabled>
                    <TiptapEditor key={activeLanguage} value={currentContent} />
                </ConfigProvider>
            ) : (
                <>
                    <TiptapEditor
                        key={activeLanguage}
                        value={currentContent}
                        onChange={(html) => setEdits((prev) => ({ ...prev, [activeLanguage]: html }))}
                    />

                    <Space className={styles.actions}>
                        <Button
                            type="primary"
                            loading={publishing}
                            onClick={() => onPublish(mergeLegalContentMap(initialContentByLanguage, edits))}
                        >
                            {t('tenants.legal.dataProcessingAgreement.publish')}
                        </Button>
                    </Space>
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
