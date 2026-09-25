import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import { useTranslation } from 'react-i18next';
import { DialogButton, Modal } from '../../../components/Modal';
import { centreLabel, TopicsLostByMove } from './topicsByCentre';
import styles from './styles.module.scss';

interface TopicsLostByMoveDialogProps {
    lost: TopicsLostByMove;
    canEditTarget: boolean;
    busy: boolean;
    onAddToTarget: () => void;
    onDrop: () => void;
    onCreateCentre: () => void;
    onClose: () => void;
}

/** Admin#1034: the new centre does not offer a topic the counsellor had at the old one. */
export const TopicsLostByMoveDialog = ({
    lost,
    canEditTarget,
    busy,
    onAddToTarget,
    onDrop,
    onCreateCentre,
    onClose,
}: TopicsLostByMoveDialogProps) => {
    const { t } = useTranslation();
    const agency = centreLabel(lost.target);

    return (
        <Modal
            icon={<CompareArrowsOutlinedIcon />}
            title={t('counselor.topicsLostByMove.title')}
            width={640}
            onClose={onClose}
            footer={
                <div className={styles.dialogActions}>
                    <DialogButton onClick={onCreateCentre} disabled={busy}>
                        {t('counselor.topicsLostByMove.createCentre')}
                    </DialogButton>
                    <DialogButton onClick={onDrop} disabled={busy}>
                        {t('counselor.topicsLostByMove.drop')}
                    </DialogButton>
                    <DialogButton
                        primary
                        onClick={onAddToTarget}
                        loading={busy}
                        disabled={!canEditTarget}
                        aria-describedby={canEditTarget ? undefined : 'topics-lost-no-right'}
                    >
                        {t('counselor.topicsLostByMove.addToTarget', { agency })}
                    </DialogButton>
                </div>
            }
        >
            <p>
                {t('counselor.topicsLostByMove.text', {
                    agency,
                    topics: lost.topics.map(({ label }) => label).join(', '),
                })}
            </p>
            {!canEditTarget && (
                <p id="topics-lost-no-right" className={styles.dialogHint}>
                    {t('counselor.topicsLostByMove.noAgencyRight', { agency })}
                </p>
            )}
            <p className={styles.dialogHint}>{t('counselor.topicsLostByMove.createCentreHint')}</p>
        </Modal>
    );
};
