import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useTranslation } from 'react-i18next';
import { Modal, DialogButton } from '../../../../Modal';
import styles from '../PublishSourceWarningModal/styles.module.scss';

interface RevertToInheritedModalProps {
    open: boolean;
    pending?: boolean;
    /** Clears the Fachbereich's own text. */
    onConfirm: () => void;
    /** Back to the editor, nothing cleared. */
    onCancel: () => void;
}

/**
 * Warning before a Fachbereich's own legal text is cleared so it inherits the agency text again
 * (ORISO-Admin#916). The live text is removed; the version history keeps the old version.
 */
export const RevertToInheritedModal = ({ open, pending = false, onConfirm, onCancel }: RevertToInheritedModalProps) => {
    const { t } = useTranslation();

    if (!open) {
        return null;
    }

    return (
        <Modal
            titleKey="legal.revert.title"
            icon={<WarningAmberOutlinedIcon />}
            width={600}
            onClose={onCancel}
            footer={
                <div className={styles.footerActions}>
                    <DialogButton onClick={onCancel}>{t('legal.revert.cancel')}</DialogButton>
                    <DialogButton primary onClick={onConfirm} disabled={pending}>
                        {t('legal.revert.confirm')}
                    </DialogButton>
                </div>
            }
        >
            <p>{t('legal.revert.description')}</p>
            <p className={styles.hint}>{t('legal.revert.hint')}</p>
        </Modal>
    );
};
