import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import Title from 'antd/lib/typography/Title';

export interface UnsavedChangesProps {
    onConfirm: () => void;
    onClose: () => void;
}

export const UnsavedChangesModal = ({ onConfirm, onClose }: UnsavedChangesProps) => {
    const { t } = useTranslation();

    return (
        <Modal
            title={<Title level={2}>{t('overlay.unsaved.title')}</Title>}
            open
            onOk={onClose}
            onCancel={onConfirm}
            cancelText={t('overlay.unsaved.confirm')}
            centered
            okText={t('overlay.unsaved.cancel')}
        >
            {t('overlay.unsaved.text')}
        </Modal>
    );
};
