import { Modal as AntModal } from 'antd';
import { useTranslation } from 'react-i18next';
import Title from 'antd/lib/typography/Title';
import { ReactNode } from 'react';

export interface ModalProps {
    titleKey?: string;
    titleKeyOptions?: Record<string, unknown>;
    cancelLabelKey?: string;
    okLabelKey?: string;
    contentKey?: string;
    contentKeyOptions?: Record<string, unknown>;
    children?: ReactNode;
    onConfirm?: () => void;
    onClose?: () => void;
    footer?: ReactNode;
}

export const Modal = ({
    titleKey,
    titleKeyOptions,
    okLabelKey,
    cancelLabelKey,
    children,
    onConfirm,
    onClose,
    contentKey,
    contentKeyOptions,
    footer,
}: ModalProps) => {
    const { t } = useTranslation();

    return (
        <AntModal
            title={<Title level={2}>{titleKey ? t(titleKey, titleKeyOptions) : null}</Title>}
            open
            destroyOnClose
            centered
            maskClosable
            keyboard
            onCancel={onClose}
            onOk={onConfirm}
            cancelText={cancelLabelKey && t(cancelLabelKey)}
            okText={okLabelKey && t(okLabelKey)}
            footer={footer}
            afterClose={() => {
                document.querySelectorAll('.ant-modal-root:empty').forEach((root) => root.remove());
            }}
        >
            {contentKey && t(contentKey, contentKeyOptions)}
            {children}
        </AntModal>
    );
};
