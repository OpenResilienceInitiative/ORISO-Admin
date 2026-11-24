import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    deleteTenant,
    getTenantDeletionPreview,
    type TenantDeletionOutcome,
    type TenantDeletionPreview,
} from '../../../../api/tenant/tenantDeletion';
import { Modal } from '../../../../components/Modal';
import { TENANTS_QUERY_KEY } from '../../../../hooks/useTenantsData';
import decodeHTML from '../../../../utils/decodeHTML';
import styles from './styles.module.scss';

/** Preview counts in the order the dialog lists them; a count of 0 is not shown. */
const PREVIEW_LINES: (keyof TenantDeletionPreview)[] = [
    'agencies',
    'consultants',
    'adviceSeekers',
    'agencyAdmins',
    'tenantAdmins',
    'openInvites',
];

type PreviewState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; preview: TenantDeletionPreview };

interface TenantDeletionModalProps {
    tenant: { id: number | null; name: string };
    onClose: () => void;
}

const TenantDeletionOutcomeView = ({ outcome }: { outcome: TenantDeletionOutcome }) => {
    const { t } = useTranslation();
    if (outcome.result !== 'deleted') {
        return (
            <p role="alert">
                {t(`tenants.delete.outcome.${outcome.result}`, {
                    status: outcome.result === 'failed' ? outcome.status ?? '–' : undefined,
                })}
            </p>
        );
    }
    const { details } = outcome;
    return (
        <>
            <p role="status">
                {t(details.complete ? 'tenants.delete.outcome.complete' : 'tenants.delete.outcome.incomplete')}
            </p>
            {details.failures.length > 0 && (
                <>
                    <p>{t('tenants.delete.failedIntro')}</p>
                    <ul className={styles.list} data-testid="tenant-delete-failures">
                        {details.failures.map((failure, index) => (
                            <li key={`${failure.kind}-${failure.id ?? index}`}>
                                <strong>{t(`tenants.delete.failureKind.${failure.kind}`)}</strong>
                                {failure.id ? ` ${failure.id}` : ''}
                                {': '}
                                {t('tenants.delete.failureReason', { reason: failure.reason })}
                            </li>
                        ))}
                    </ul>
                    <p>{t('tenants.delete.retryHint')}</p>
                </>
            )}
        </>
    );
};

/**
 * Deleting a Träger takes everything below it with it (ORISO-Admin#1525): its Beratungsstellen,
 * their accounts and its admins. The dialog says what goes before anything happens, then lists what
 * could not be handled and why. Only the platform administrator reaches it; deleting a Träger that
 * is already being deleted repeats what was left over.
 */
export const TenantDeletionModal = ({ tenant, onClose }: TenantDeletionModalProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
    const [running, setRunning] = useState(false);
    const [outcome, setOutcome] = useState<TenantDeletionOutcome | null>(null);

    useEffect(() => {
        let current = true;
        if (tenant.id === null) {
            setPreview({ status: 'failed' });
            return undefined;
        }
        getTenantDeletionPreview(tenant.id)
            .then((loaded) => current && setPreview({ status: 'ready', preview: loaded }))
            .catch(() => current && setPreview({ status: 'failed' }));
        return () => {
            current = false;
        };
    }, [tenant.id]);

    const confirm = async () => {
        if (tenant.id === null) return;
        setRunning(true);
        try {
            setOutcome(await deleteTenant(tenant.id));
        } finally {
            setRunning(false);
        }
    };

    const close = () => {
        if (outcome) {
            // The list shows the Träger as being deleted from now on.
            queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
            queryClient.removeQueries({ queryKey: ['TENANT', tenant.id] });
        }
        onClose();
    };

    if (outcome) {
        return (
            <Modal
                titleKey={outcome.result === 'deleted' ? 'tenants.delete.resultTitle' : 'tenants.delete.failedTitle'}
                icon={<DeleteOutlineOutlinedIcon />}
                okLabelKey="tenants.delete.close"
                onConfirm={close}
                onClose={close}
            >
                <TenantDeletionOutcomeView outcome={outcome} />
            </Modal>
        );
    }

    const lines = preview.status === 'ready' ? PREVIEW_LINES.filter((line) => (preview.preview[line] ?? 0) > 0) : [];

    return (
        <Modal
            titleKey="tenants.delete.title"
            titleKeyOptions={{ name: decodeHTML(tenant.name) }}
            icon={<DeleteOutlineOutlinedIcon />}
            // Once the deletion runs, nothing closes the dialog: its result has to be seen.
            closable={!running}
            maskClosable={!running}
            keyboard={!running}
            cancelLabelKey={running ? undefined : 'tenants.list.deleteModal.cancel'}
            okLabelKey="tenants.list.deleteModal.confirm"
            confirmLoading={running}
            confirmDisabled={running || preview.status !== 'ready'}
            onConfirm={confirm}
            onClose={() => {
                if (!running) onClose();
            }}
        >
            {preview.status === 'loading' && <p role="status">{t('tenants.delete.previewLoading')}</p>}
            {preview.status === 'failed' && <p role="alert">{t('tenants.delete.previewFailed')}</p>}
            {preview.status === 'ready' && (
                <>
                    <p>{t('tenants.delete.whatGoes')}</p>
                    <ul className={styles.list} data-testid="tenant-delete-preview">
                        {lines.map((line) => (
                            <li key={line}>{t(`tenants.delete.preview.${line}`, { count: preview.preview[line] })}</li>
                        ))}
                        <li>{t('tenants.delete.preview.everything')}</li>
                    </ul>
                    <p>{t('tenants.delete.effectNow')}</p>
                    <p>{t('tenants.delete.effectNightly')}</p>
                </>
            )}
        </Modal>
    );
};
