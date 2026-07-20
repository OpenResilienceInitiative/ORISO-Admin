import { useEffect, useState } from 'react';
import { Alert, Checkbox, Typography } from 'antd';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import { useTranslation } from 'react-i18next';
import { Modal, DialogButton } from '../../../../Modal';
import styles from './styles.module.scss';

interface TranslateOnPublishModalProps {
    open: boolean;
    /** The source ("Rechtssprache") the text is translated from. */
    sourceLanguage: string;
    /** The tenant's active languages minus the source. All preselected. */
    targetLanguages: string[];
    /** true while the translate call is running. */
    translating?: boolean;
    /** i18n key of a human error message (already mapped from the backend code). */
    errorKey?: string | null;
    /** Translate into the selected languages, then publish the complete map. */
    onConfirm: (selectedLanguages: string[]) => void;
    /** Publish without any translation. */
    onSkip: () => void;
    onCancel: () => void;
}

/**
 * Modal shown when publishing a legal card: pick the languages to machine-translate
 * the source text into (one call for all of them) — or publish without translation.
 */
export const TranslateOnPublishModal = ({
    open,
    sourceLanguage,
    targetLanguages,
    translating,
    errorKey,
    onConfirm,
    onSkip,
    onCancel,
}: TranslateOnPublishModalProps) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string[]>(targetLanguages);

    // Preselect all target languages every time the modal opens.
    useEffect(() => {
        if (open) {
            setSelected(targetLanguages);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, targetLanguages.join(',')]);

    const sourceLabel = t(`language.${sourceLanguage}`, sourceLanguage);

    if (!open) {
        return null;
    }

    return (
        <Modal
            titleKey="legal.translation.modal.title"
            icon={<TranslateOutlinedIcon />}
            width={600}
            onClose={onCancel}
            footer={
                <div className={styles.footerActions}>
                    <DialogButton onClick={onSkip} disabled={translating}>
                        {t('legal.translation.modal.skip')}
                    </DialogButton>
                    <DialogButton primary loading={translating} onClick={() => onConfirm(selected)}>
                        {t('legal.translation.modal.confirm')}
                    </DialogButton>
                </div>
            }
        >
            <p>{t('legal.translation.modal.description', { language: sourceLabel })}</p>
            <Checkbox.Group
                className={styles.languageList}
                value={selected}
                onChange={(values) => setSelected(values as string[])}
                options={targetLanguages.map((language) => ({
                    value: language,
                    label: t(`language.${language}`, language),
                }))}
            />
            <Typography.Text className={styles.providerHint}>
                {t('legal.translation.modal.providerHint')}
            </Typography.Text>
            {errorKey && <Alert className={styles.error} type="error" showIcon message={t(errorKey)} />}
        </Modal>
    );
};

export default TranslateOnPublishModal;
