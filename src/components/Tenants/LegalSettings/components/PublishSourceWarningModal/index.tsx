import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useTranslation } from 'react-i18next';
import { Modal, DialogButton } from '../../../../Modal';
import styles from './styles.module.scss';

interface PublishSourceWarningModalProps {
    open: boolean;
    /** The source ("Rechtssprache") whose variant was not touched in this session. */
    sourceLanguage: string;
    /** The non-source languages the admin actually edited. */
    editedLanguages: string[];
    /** Publish anyway — continues into the regular publish flow. */
    onConfirm: () => void;
    /** Back to the editor without publishing. */
    onCancel: () => void;
}

/**
 * Warning shown when the admin publishes edits only in non-source languages while the
 * source-language variant stayed untouched (#720): advice seekers primarily read the
 * source language, so an unchanged source variant next to an edited translation is the
 * exact silent failure #718 documented. Informational — confirming still publishes.
 */
export const PublishSourceWarningModal = ({
    open,
    sourceLanguage,
    editedLanguages,
    onConfirm,
    onCancel,
}: PublishSourceWarningModalProps) => {
    const { t } = useTranslation();

    if (!open) {
        return null;
    }

    const sourceLabel = t(`language.${sourceLanguage}`, sourceLanguage);
    const editedLabels = editedLanguages.map((language) => t(`language.${language}`, language)).join(', ');

    return (
        <Modal
            titleKey="legal.publishWarning.title"
            icon={<WarningAmberOutlinedIcon />}
            width={600}
            onClose={onCancel}
            footer={
                <div className={styles.footerActions}>
                    <DialogButton onClick={onCancel}>{t('legal.publishWarning.cancel')}</DialogButton>
                    <DialogButton primary onClick={onConfirm}>
                        {t('legal.publishWarning.confirm')}
                    </DialogButton>
                </div>
            }
        >
            <p>{t('legal.publishWarning.description', { languages: editedLabels, source: sourceLabel })}</p>
            <p className={styles.hint}>{t('legal.publishWarning.hint', { source: sourceLabel })}</p>
        </Modal>
    );
};

export default PublishSourceWarningModal;
