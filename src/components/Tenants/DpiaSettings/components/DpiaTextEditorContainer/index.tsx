import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    const [saveFailed, setSaveFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    // Remembers the exact map + publish flag from the last save attempt, so the save-error
    // retry button can replay it without asking the (still-mounted) editor to resupply it.
    const lastSaveAttempt = useRef<{ texts: DpiaTextMap; publish: boolean } | undefined>(undefined);
    // Bumped on every load call (from the effect OR a manual retry click) so a response that
    // resolves after a newer one was already issued — a slower tenant-A request outliving a
    // tenant-B switch, or two retry clicks in a row — is discarded instead of overwriting state.
    const loadToken = useRef(0);
    // Bumped ONLY on a tenant switch (see the reset effect below). A save is bound to the tenant
    // it was fired for the same way a load is bound to its token: without this, a save started
    // on tenant A that resolves after the admin has switched to tenant B would apply A's result
    // (or A's error/saving flags) to B's now-mounted editor, and a follow-up save from B could
    // then submit A's stale texts under B's id.
    const tenantEpoch = useRef(0);

    const load = useCallback(() => {
        // An id that cannot resolve to a tenant is a failed load, not an eternal skeleton: the
        // admin needs the same error + retry affordance as a network failure would give them.
        if (!Number.isFinite(id) || id <= 0) {
            setLoadFailed(true);
            return;
        }
        setLoadFailed(false);
        loadToken.current += 1;
        const token = loadToken.current;
        resolvedGateway
            .load(id)
            .then((next) => {
                if (loadToken.current === token) setDocument(next);
            })
            .catch(() => {
                if (loadToken.current === token) setLoadFailed(true);
            });
    }, [id, resolvedGateway]);

    useEffect(() => {
        // Reset to a clean slate BEFORE the new tenant's load resolves: without this, switching
        // tenants would keep showing (and let the admin keep editing) the previous tenant's
        // document and any of its unsaved edits until the new load happened to land, and a save
        // in that window could write tenant A's edits under tenant B's id.
        tenantEpoch.current += 1;
        setDocument(undefined);
        setSaveFailed(false);
        setSaving(false);
        lastSaveAttempt.current = undefined;
        load();
    }, [load]);

    const handleSave = useCallback(
        (texts: DpiaTextMap, publish: boolean) => {
            if (!Number.isFinite(id) || id <= 0) return;
            lastSaveAttempt.current = { texts, publish };
            setSaving(true);
            setSaveFailed(false);
            const epoch = tenantEpoch.current;
            resolvedGateway
                .save(id, texts, publish)
                .then((next) => {
                    if (tenantEpoch.current === epoch) setDocument(next);
                })
                .catch(() => {
                    if (tenantEpoch.current === epoch) setSaveFailed(true);
                })
                .finally(() => {
                    if (tenantEpoch.current === epoch) setSaving(false);
                });
        },
        [id, resolvedGateway],
    );

    const retrySave = () => {
        if (lastSaveAttempt.current) handleSave(lastSaveAttempt.current.texts, lastSaveAttempt.current.publish);
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
                    <Button size="small" onClick={() => load()}>
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
        <>
            {/* A save failure is not a load failure: the editor and its unsaved chapters stay
                mounted, and only a save (not a re-fetch) is retried. */}
            {saveFailed && (
                <Alert
                    type="error"
                    showIcon
                    closable
                    onClose={() => setSaveFailed(false)}
                    message={t('dpia.editor.saveError')}
                    action={
                        <Button size="small" onClick={retrySave}>
                            {t('tenants.legal.version.retry')}
                        </Button>
                    }
                />
            )}
            <DpiaTextEditor
                // Remount on tenant switch: the editor's own `edits` state has no idea the tenant
                // changed, so without a fresh instance tenant A's unsaved edits would keep
                // overriding tenant B's loaded texts (mirrors AgencyLegalTextContainer's key).
                key={id}
                initialTexts={document.texts}
                statusBySection={document.statusBySection}
                onSave={handleSave}
                saving={saving}
                readOnly={readOnly}
            />
        </>
    );
};

export default DpiaTextEditorContainer;
