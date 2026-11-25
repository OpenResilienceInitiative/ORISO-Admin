import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTenantDeletionPreview, type TenantDeletionBlockers } from '../../../../api/tenant/tenantDeletionBlockers';
import { Modal } from '../../../../components/Modal';
import decodeHTML from '../../../../utils/decodeHTML';
import styles from './styles.module.scss';

/** Preview counts in the order the dialog lists them; a count of 0 is not shown. */
const PREVIEW_LINES: (keyof TenantDeletionBlockers)[] = [
    'agencies',
    'consultants',
    'adviceSeekers',
    'agencyAdmins',
    'tenantAdmins',
    'openInvites',
];

type PreviewState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; preview: TenantDeletionBlockers };

interface TenantDeletionModalProps {
    tenant: { id: number | null; name: string };
    /** Runs the deletion; the caller reports the result and closes the dialog. */
    onConfirm: (id: number) => void;
    onClose: () => void;
}

/**
 * Deleting a Träger takes everything below it with it (ORISO-Admin#1525): its Beratungsstellen,
 * their accounts and its admins. The dialog says what goes before anything happens. It offers no
 * deletion without that overview; the result (or the blockers from #1466) is reported by the list.
 */
export const TenantDeletionModal = ({ tenant, onConfirm, onClose }: TenantDeletionModalProps) => {
    const { t } = useTranslation();
    const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });

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

    const lines = preview.status === 'ready' ? PREVIEW_LINES.filter((line) => (preview.preview[line] ?? 0) > 0) : [];

    return (
        <Modal
            titleKey="tenants.delete.title"
            titleKeyOptions={{ name: decodeHTML(tenant.name) }}
            icon={<DeleteOutlineOutlinedIcon />}
            cancelLabelKey="tenants.list.deleteModal.cancel"
            okLabelKey="tenants.list.deleteModal.confirm"
            confirmDisabled={preview.status !== 'ready'}
            onConfirm={() => {
                if (tenant.id !== null) onConfirm(tenant.id);
            }}
            onClose={onClose}
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
