import { message } from 'antd';
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FETCH_ERRORS } from '../../../../../api/fetchData';
import { Modal } from '../../../../../components/Modal';
import {
    useCancelConsultantDeletion,
    usePauseConsultantDeletion,
} from '../../../../../hooks/useConsultantDeletionWindow';
import styles from './styles.module.scss';

export type DeletionWindowMode = 'cancel' | 'pause';

interface DeletionWindowModalProps {
    mode: DeletionWindowMode;
    consultantId: string;
    onClose: () => void;
}

const DEFAULT_MONTHS = 3;
const MONTH_CHOICES = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Which message an admin sees for a failed request. Always an i18n key, never the server's text;
 * "no access", "too late" and "invalid input" stay apart. A CATCH_ALL failure was already toasted
 * by fetchData, so it yields no key here.
 */
const errorKeyFor = (error: unknown): string | null => {
    if (error instanceof Response) {
        if (error.status === 409) return 'deletionWindow.error.tooLate';
        if (error.status === 400) return 'deletionWindow.error.invalid';
        return 'deletionWindow.error.default';
    }
    if (error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN) return 'deletionWindow.error.forbidden';
    if (error instanceof Error && error.message === FETCH_ERRORS.CATCH_ALL) return null;
    return 'deletionWindow.error.default';
};

/** Cancel or pause the running deletion of a consultant (OBP 2.1 #123). */
export const DeletionWindowModal = ({ mode, consultantId, onClose }: DeletionWindowModalProps) => {
    const { t } = useTranslation();
    const reasonId = useId();
    const monthsId = useId();
    const [reason, setReason] = useState('');
    const [months, setMonths] = useState(DEFAULT_MONTHS);

    const onError = (error: unknown) => {
        const key = errorKeyFor(error);
        if (key) message.error({ content: t(key), duration: 5 });
    };

    const { mutate: cancelDeletion } = useCancelConsultantDeletion({
        onSuccess: () => {
            message.success({ content: t('deletionWindow.cancel.success'), duration: 3 });
            onClose();
        },
        onError,
    });
    const { mutate: pauseDeletion } = usePauseConsultantDeletion({
        onSuccess: () => {
            message.success({ content: t('deletionWindow.pause.success'), duration: 3 });
            onClose();
        },
        onError,
    });

    if (mode === 'cancel') {
        return (
            <Modal
                titleKey="deletionWindow.cancel.title"
                icon={<RestoreFromTrashOutlinedIcon />}
                cancelLabelKey="btn.cancel.uppercase"
                okLabelKey="deletionWindow.cancel.confirm"
                onConfirm={() => cancelDeletion(consultantId)}
                onClose={onClose}
            >
                <p>{t('deletionWindow.cancel.text')}</p>
                <p>{t('deletionWindow.cancel.notRestored')}</p>
            </Modal>
        );
    }

    return (
        <Modal
            titleKey="deletionWindow.pause.title"
            icon={<PauseCircleOutlineOutlinedIcon />}
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="deletionWindow.pause.confirm"
            confirmDisabled={reason.trim() === ''}
            onConfirm={() => pauseDeletion({ id: consultantId, reason, months })}
            onClose={onClose}
        >
            <p>{t('deletionWindow.pause.text')}</p>
            <div className={styles.field}>
                <label htmlFor={reasonId}>{t('deletionWindow.pause.reason')}</label>
                <textarea
                    id={reasonId}
                    className={styles.control}
                    value={reason}
                    maxLength={500}
                    rows={3}
                    required
                    onChange={(event) => setReason(event.target.value)}
                />
            </div>
            <div className={styles.field}>
                <label htmlFor={monthsId}>{t('deletionWindow.pause.months')}</label>
                <select
                    id={monthsId}
                    className={styles.control}
                    value={months}
                    onChange={(event) => setMonths(Number(event.target.value))}
                >
                    {MONTH_CHOICES.map((choice) => (
                        <option key={choice} value={choice}>
                            {choice}
                        </option>
                    ))}
                </select>
            </div>
        </Modal>
    );
};
