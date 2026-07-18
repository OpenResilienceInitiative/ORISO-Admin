import { Modal as AntModal } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';
import styles from './styles.module.scss';

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
    /** Custom footer content; replaces the standard text-button actions. */
    footer?: ReactNode;
    width?: number | string;
    /** Optional 32px hero icon centered above the title (M3 basic dialog). */
    icon?: ReactNode;
    /** Full-width divider between content and actions. Defaults to true. */
    showDivider?: boolean;
    /** Disables the confirm text button (e.g. while submitting). */
    confirmDisabled?: boolean;
}

/**
 * Standard M3 basic dialog (Design-System M3_ORISO, node 60942-12062).
 * Renders the house anatomy — hero icon, centered headline-small title,
 * body-medium content, divider and right-aligned M3 text buttons — so every
 * confirm/delete dialog across the admin looks identical. Pass `footer` only
 * for genuinely custom action rows.
 */
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
    width,
    icon,
    showDivider = true,
    confirmDisabled = false,
}: ModalProps) => {
    const { t } = useTranslation();

    const hasStandardActions = Boolean(cancelLabelKey || okLabelKey);

    const standardActions = hasStandardActions ? (
        <div className={styles.actions}>
            {cancelLabelKey && (
                <button type="button" className={styles.actionButton} onClick={onClose}>
                    {t(cancelLabelKey)}
                </button>
            )}
            {okLabelKey && (
                <button type="button" className={styles.actionButton} disabled={confirmDisabled} onClick={onConfirm}>
                    {t(okLabelKey)}
                </button>
            )}
        </div>
    ) : null;

    const resolvedFooter = footer ?? standardActions;

    return (
        <AntModal
            className={styles.modal}
            styles={{
                mask: { background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)' },
            }}
            title={
                titleKey ? (
                    <div className={styles.titleBlock}>
                        {icon && (
                            <span className={styles.heroIcon} aria-hidden>
                                {icon}
                            </span>
                        )}
                        <div className={styles.title}>{t(titleKey, titleKeyOptions)}</div>
                    </div>
                ) : null
            }
            open
            destroyOnClose
            centered
            maskClosable
            keyboard
            onCancel={onClose}
            footer={
                resolvedFooter ? (
                    <>
                        {showDivider && <div className={styles.divider} aria-hidden />}
                        {resolvedFooter}
                    </>
                ) : null
            }
            width={width}
            afterClose={() => {
                document.querySelectorAll('.ant-modal-root:empty').forEach((root) => root.remove());
            }}
        >
            {contentKey && t(contentKey, contentKeyOptions)}
            {children}
        </AntModal>
    );
};
