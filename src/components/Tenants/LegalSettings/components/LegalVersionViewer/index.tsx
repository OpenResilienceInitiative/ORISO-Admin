import { useState } from 'react';
import { ConfigProvider, Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import TiptapEditor from '../../../../FormPluginEditor/TiptapEditor';
import styles from './styles.module.scss';

export interface LegalVersion {
    /** Stable id for the version — e.g. the activation timestamp in ISO form. */
    id: string;
    /** Human-readable label shown in the select — e.g. "13. Jul 2026 – 10:22". */
    label: string;
    /** The version's HTML content. */
    content: string;
}

interface LegalVersionViewerProps {
    versions: LegalVersion[];
    /** Which version is selected initially (defaults to the first entry = latest). */
    defaultVersionId?: string;
}

/**
 * Read-only viewer for the earlier versions of a legal text (DPA / privacy / imprint).
 * The user picks the version to inspect from a select field; that version's text is shown
 * read-only in the (disabled) TipTap editor — no editing, no toolbar. Deliberately simple:
 * it only displays, it never edits, so versioning stays a lightweight "look back" feature.
 */
export const LegalVersionViewer = ({ versions, defaultVersionId }: LegalVersionViewerProps) => {
    const { t } = useTranslation();
    const [selectedId, setSelectedId] = useState(defaultVersionId ?? versions[0]?.id);

    if (!versions.length) {
        return null;
    }

    const selected = versions.find((v) => v.id === selectedId) ?? versions[0];

    return (
        <div className={styles.viewer}>
            <Space className={styles.selector} align="center">
                <Typography.Text>{t('tenants.legal.version.label', 'Version')}</Typography.Text>
                <Select
                    value={selected.id}
                    onChange={setSelectedId}
                    options={versions.map((v) => ({ value: v.id, label: v.label }))}
                    className={styles.select}
                    aria-label={t('tenants.legal.version.label', 'Version')}
                />
            </Space>
            <ConfigProvider componentDisabled>
                <TiptapEditor value={selected.content} />
            </ConfigProvider>
        </div>
    );
};

export default LegalVersionViewer;
