import { Modal as AntModal } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';
import { ReactComponent as CheckV2 } from '../../resources/img/illustrations/CheckV2.svg';

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

export const ModalSuccess = ({
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
            title={
                <div className={styles.successContainer}>
                    <CheckV2 className={styles.successIcon} />
                </div>
            }
            open
            width={700}
            destroyOnClose
            className={styles.modal}
            centered
            onCancel={onClose}
            onOk={onConfirm}
            cancelText={cancelLabelKey && t(cancelLabelKey)}
            okText={okLabelKey && t(okLabelKey)}
            footer={footer}
        >
            {titleKey && <div className={styles.titleContainer}>{t(titleKey)}</div>}
            {contentKey && <div className={styles.content}>{t(contentKey)}</div>}
            {children}
        </AntModal>
    );
};
