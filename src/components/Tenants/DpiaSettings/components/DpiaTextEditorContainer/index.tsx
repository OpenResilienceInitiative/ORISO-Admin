import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { DpiaTextEditor } from '../DpiaTextEditor';
import { DpiaTextDocument, DpiaTextGateway, createMockDpiaTextGateway } from '../../api/dpiaTextGateway';
import { DpiaTextMap } from '../../utils/dpiaSections';

interface DpiaTextEditorContainerProps {
    tenantId: string | number;
    /**
     * Persistence adapter. Defaults to the in-memory mock: the real endpoint is a pending
     * extension of `/tenantadmin/{id}/dpia` (ORISO-TenantService PR#187), and until it lands the
     * page must not pretend to talk to a server.
     */
    gateway?: DpiaTextGateway;
    readOnly?: boolean;
}

/**
 * Loads the tenant's DSFA free texts and wires the save/publish calls. Kept separate from the
 * card so the card stays a pure, story-testable component with no data fetching in it.
 */
export const DpiaTextEditorContainer = ({ tenantId, gateway, readOnly }: DpiaTextEditorContainerProps) => {
    const { t } = useTranslation();
    const id = Number(tenantId);
    // A caller-supplied gateway wins; otherwise one mock instance per mount keeps its own store.
    const resolvedGateway = useMemo(() => gateway ?? createMockDpiaTextGateway(), [gateway]);

    const [document, setDocument] = useState<DpiaTextDocument>();
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        if (!Number.isFinite(id) || id <= 0) return;
        setLoadFailed(false);
        resolvedGateway
            .load(id)
            .then(setDocument)
            .catch(() => setLoadFailed(true));
    }, [id, resolvedGateway]);

    useEffect(load, [load]);

    const handleSave = (texts: DpiaTextMap, publish: boolean) => {
        setSaving(true);
        resolvedGateway
            .save(id, texts, publish)
            .then(setDocument)
            .catch(() => setLoadFailed(true))
            .finally(() => setSaving(false));
    };

    // A failed load must not look like "nothing written yet": editing on an unknown current
    // state could silently overwrite an existing DSFA text, so we withhold the editor.
    if (loadFailed) {
        return (
            <Alert
                type="error"
                showIcon
                message={t('dpia.editor.loadError')}
                action={
                    <Button size="small" onClick={load}>
                        {t('tenants.legal.version.retry')}
                    </Button>
                }
            />
        );
    }

    if (!document) {
        return <Skeleton active paragraph={{ rows: 6 }} />;
    }

    return (
        <DpiaTextEditor
            initialTexts={document.texts}
            statusBySection={document.statusBySection}
            onSave={handleSave}
            saving={saving}
            readOnly={readOnly}
        />
    );
};

export default DpiaTextEditorContainer;
