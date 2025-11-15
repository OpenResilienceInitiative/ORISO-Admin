import { Modal as AntModal } from 'antd';
import { useTranslation } from 'react-i18next';
import Title from 'antd/lib/typography/Title';

export interface ModalProps {
    titleKey?: string;
    cancelLabelKey?: string;
    okLabelKey?: string;
    contentKey?: string;
    children?: React.ReactChild | React.ReactChild[];
    onConfirm?: () => void;
    onClose?: () => void;
    footer?: React.ReactChild;
}

export const Modal = ({
    titleKey,
    okLabelKey,
    cancelLabelKey,
    children,
    onConfirm,
    onClose,
    contentKey,
    footer,
}: ModalProps) => {
    const { t } = useTranslation();

    return (
        <AntModal
            title={<Title level={2}>{t(titleKey)}</Title>}
            open
            destroyOnClose
            centered
            onCancel={onClose}
            onOk={onConfirm}
            cancelText={cancelLabelKey && t(cancelLabelKey)}
            okText={okLabelKey && t(okLabelKey)}
            footer={footer}
        >
            {contentKey && t(contentKey)}
            {children}
        </AntModal>
    );
};
