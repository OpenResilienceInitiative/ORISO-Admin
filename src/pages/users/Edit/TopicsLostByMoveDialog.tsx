import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import { useTranslation } from 'react-i18next';
import { DialogButton, Modal } from '../../../components/Modal';
import { centreLabel, TopicsLostByMove } from './topicsByCentre';
import styles from './styles.module.scss';

interface TopicsLostByMoveDialogProps {
    lost: TopicsLostByMove;
    canEditTarget: boolean;
    /** The platform allows one topic per centre (#1083 switch). */
    oneTopicPerAgency: boolean;
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
    oneTopicPerAgency,
    busy,
    onAddToTarget,
    onDrop,
    onCreateCentre,
    onClose,
}: TopicsLostByMoveDialogProps) => {
    const { t } = useTranslation();
    const agency = centreLabel(lost.target);
    const exceedsOneTopic = oneTopicPerAgency && (lost.target.topics?.length ?? 0) + lost.topics.length > 1;
    // Disabled, not hidden, and the first reason that applies is named.
    let blockedReason: string | null = null;
    if (!canEditTarget) {
        blockedReason = t('counselor.topicsLostByMove.noAgencyRight', { agency });
    } else if (exceedsOneTopic) {
        blockedReason = t('counselor.topicsLostByMove.oneTopicPerAgency', { agency });
    }

    return (
        <Modal
            icon={<CompareArrowsOutlinedIcon />}
            title={t('counselor.topicsLostByMove.title')}
            width={640}
            onClose={onClose}
            // No way out while the centre is being changed: the save follows that request.
            closable={!busy}
            maskClosable={!busy}
            keyboard={!busy}
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
                        disabled={Boolean(blockedReason)}
                        aria-describedby={blockedReason ? 'topics-lost-blocked' : undefined}
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
            <p className={styles.dialogHint}>{t('counselor.topicsLostByMove.publicAtTarget', { agency })}</p>
            {blockedReason && (
                <p id="topics-lost-blocked" className={styles.dialogHint}>
                    {blockedReason}
                </p>
            )}
            <p className={styles.dialogHint}>{t('counselor.topicsLostByMove.createCentreHint')}</p>
        </Modal>
    );
};
