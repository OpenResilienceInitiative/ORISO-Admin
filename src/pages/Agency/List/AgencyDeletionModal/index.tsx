import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    deleteAgency,
    getAgencyDeletionPreview,
    type AgencyDeletionOutcome,
    type AgencyDeletionPreview,
} from '../../../../api/agency/agencyDeletion';
import { Modal } from '../../../../components/Modal';
import { AgencyData } from '../../../../types/agency';
import styles from './styles.module.scss';

/** Preview counts in the order the dialog lists them; a count of 0 is not shown. */
const PREVIEW_LINES: (keyof AgencyDeletionPreview)[] = [
    'consultantsDeleted',
    'consultantsUnassigned',
    'adviceSeekers',
    'keptAdviceSeekerSessions',
    'openEnquiries',
    'agencyAdmins',
    'groupChats',
];

type PreviewState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; preview: AgencyDeletionPreview };

const AgencyDeletionOutcomeView = ({ outcome }: { outcome: AgencyDeletionOutcome }) => {
    const { t } = useTranslation();
    if (outcome.result !== 'deleted') {
        return (
            <p role="alert">
                {t(`agency.delete.outcome.${outcome.result}`, {
                    status: outcome.result === 'failed' ? outcome.status ?? '–' : undefined,
                })}
            </p>
        );
    }
    const { details } = outcome;
    return (
        <>
            <p role="status">
                {t(details.complete ? 'agency.delete.outcome.complete' : 'agency.delete.outcome.incomplete')}
            </p>
            {details.failures.length > 0 && (
                <>
                    <p>{t('agency.delete.failedIntro')}</p>
                    <ul className={styles.list} data-testid="agency-delete-failures">
                        {details.failures.map((failure, index) => (
                            <li key={`${failure.kind}-${failure.id ?? index}`}>
                                <strong>{t(`agency.delete.failureKind.${failure.kind}`)}</strong>
                                {failure.id ? ` ${failure.id}` : ''}
                                {': '}
                                {t('agency.delete.failureReason', { reason: failure.reason })}
                            </li>
                        ))}
                    </ul>
                    <p>{t('agency.delete.retryHint')}</p>
                </>
            )}
        </>
    );
};

/**
 * Deleting a counselling centre takes everything below it with it (ORISO-Admin#1524). The dialog
 * says what goes before anything happens, then lists what could not be handled and why. Deleting
 * a centre that is already being deleted repeats what was left over.
 */
export const AgencyDeletionModal = ({ agencyModel, onClose }: { agencyModel: AgencyData; onClose: () => void }) => {
    const { t } = useTranslation();
    const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
    const [running, setRunning] = useState(false);
    const [outcome, setOutcome] = useState<AgencyDeletionOutcome | null>(null);

    useEffect(() => {
        let current = true;
        if (!agencyModel.id) {
            setPreview({ status: 'failed' });
            return undefined;
        }
        getAgencyDeletionPreview(agencyModel.id)
            .then((loaded) => current && setPreview({ status: 'ready', preview: loaded }))
            .catch(() => current && setPreview({ status: 'failed' }));
        return () => {
            current = false;
        };
    }, [agencyModel.id]);

    const confirm = async () => {
        setRunning(true);
        try {
            setOutcome(await deleteAgency(agencyModel.id as string));
        } finally {
            setRunning(false);
        }
    };

    if (outcome) {
        return (
            <Modal
                titleKey={outcome.result === 'deleted' ? 'agency.delete.resultTitle' : 'agency.delete.failedTitle'}
                icon={<DeleteOutlineOutlinedIcon />}
                okLabelKey="agency.delete.close"
                onConfirm={onClose}
                onClose={onClose}
            >
                <AgencyDeletionOutcomeView outcome={outcome} />
            </Modal>
        );
    }

    const lines = preview.status === 'ready' ? PREVIEW_LINES.filter((line) => (preview.preview[line] ?? 0) > 0) : [];

    return (
        <Modal
            titleKey="agency.delete.title"
            titleKeyOptions={{ name: agencyModel.name }}
            icon={<DeleteOutlineOutlinedIcon />}
            // Once the deletion runs, nothing closes the dialog: its result has to be seen.
            closable={!running}
            maskClosable={!running}
            keyboard={!running}
            cancelLabelKey={running ? undefined : 'btn.cancel.uppercase'}
            okLabelKey="agency.modal.btn.ok.uppercase"
            confirmLoading={running}
            confirmDisabled={running || preview.status !== 'ready'}
            onConfirm={confirm}
            onClose={() => {
                if (!running) onClose();
            }}
        >
            {preview.status === 'loading' && <p role="status">{t('agency.delete.previewLoading')}</p>}
            {preview.status === 'failed' && <p role="alert">{t('agency.delete.previewFailed')}</p>}
            {preview.status === 'ready' && (
                <>
                    <p>{t('agency.delete.whatGoes')}</p>
                    <ul className={styles.list} data-testid="agency-delete-preview">
                        {lines.map((line) => (
                            <li key={line}>{t(`agency.delete.preview.${line}`, { count: preview.preview[line] })}</li>
                        ))}
                        <li>{t('agency.delete.preview.invites')}</li>
                    </ul>
                    <p>{t('agency.delete.effectNow')}</p>
                    <p>{t('agency.delete.effectNightly')}</p>
                </>
            )}
        </Modal>
    );
};
