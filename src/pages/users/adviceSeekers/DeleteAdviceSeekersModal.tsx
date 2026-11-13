import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    deleteAdviceSeekers,
    type AdviceSeekerData,
    type AdviceSeekerDeletionOutcome,
} from '../../../api/adviceSeeker/adviceSeekers';
import { Modal } from '../../../components/Modal';
import styles from './adviceSeekers.module.scss';

// The dialog names this many people; the rest are counted.
const NAMED_LIMIT = 10;

const SUCCEEDED = new Set(['marked', 'alreadyMarked', 'notFound']);

interface DeleteAdviceSeekersModalProps {
    seekers: AdviceSeekerData[];
    /** Called once the dialog closes; `changed` is true when at least one request was sent. */
    onClose: (changed: boolean) => void;
}

/**
 * Says what deleting does before anything happens, then marks every selected advice seeker and
 * lists who could not be marked and why (ORISO-Admin#1521).
 */
export const DeleteAdviceSeekersModal = ({ seekers, onClose }: DeleteAdviceSeekersModalProps) => {
    const { t } = useTranslation();
    const [running, setRunning] = useState(false);
    const [outcomes, setOutcomes] = useState<AdviceSeekerDeletionOutcome[] | null>(null);

    const usernameOf = (id: string) => seekers.find((seeker) => seeker.id === id)?.username ?? id;

    const confirm = async () => {
        setRunning(true);
        try {
            setOutcomes(await deleteAdviceSeekers(seekers.map((seeker) => seeker.id)));
        } finally {
            setRunning(false);
        }
    };

    if (outcomes) {
        const failed = outcomes.filter((outcome) => !SUCCEEDED.has(outcome.result));
        return (
            <Modal
                titleKey="adviceSeekers.delete.resultTitle"
                icon={<DeleteOutlineOutlinedIcon />}
                okLabelKey="adviceSeekers.delete.close"
                onConfirm={() => onClose(true)}
                onClose={() => onClose(true)}
            >
                <p role="status">
                    {t('adviceSeekers.delete.resultSummary', {
                        marked: outcomes.length - failed.length,
                        total: outcomes.length,
                    })}
                </p>
                {failed.length > 0 && (
                    <>
                        <p>{t('adviceSeekers.delete.failedIntro')}</p>
                        <ul className={styles.nameList} data-testid="advice-seeker-delete-failures">
                            {failed.map((outcome) => (
                                <li key={outcome.id}>
                                    <strong>{usernameOf(outcome.id)}</strong>
                                    {': '}
                                    {t(`adviceSeekers.delete.failure.${outcome.result}`, {
                                        reason: outcome.reason ?? outcome.status ?? '–',
                                    })}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Modal>
        );
    }

    const named = seekers.slice(0, NAMED_LIMIT);
    const more = seekers.length - named.length;

    return (
        <Modal
            titleKey="adviceSeekers.delete.title"
            titleKeyOptions={{ count: seekers.length }}
            icon={<DeleteOutlineOutlinedIcon />}
            // Once the batch runs, nothing closes the dialog: the result has to be seen, and closing
            // early would hide which advice seekers could not be marked.
            closable={!running}
            maskClosable={!running}
            keyboard={!running}
            cancelLabelKey={running ? undefined : 'btn.cancel.uppercase'}
            okLabelKey="delete"
            confirmLoading={running}
            confirmDisabled={running || seekers.length === 0}
            onConfirm={confirm}
            onClose={() => {
                if (!running) onClose(false);
            }}
        >
            <ul className={styles.nameList}>
                {named.map((seeker) => (
                    <li key={seeker.id}>{seeker.username}</li>
                ))}
                {more > 0 && <li>{t('adviceSeekers.delete.andMore', { count: more })}</li>}
            </ul>
            <p>{t('adviceSeekers.delete.effectNow')}</p>
            <p>{t('adviceSeekers.delete.effectNightly')}</p>
        </Modal>
    );
};
