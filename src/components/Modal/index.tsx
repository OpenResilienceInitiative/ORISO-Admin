import { Modal as AntModal } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';
import styles from './styles.module.scss';

export { DialogButton } from './DialogButton';

export interface ModalProps {
    titleKey?: string;
    titleKeyOptions?: Record<string, unknown>;
    /** Raw title node for dynamic titles that are not an i18n key. Ignored if `titleKey` is set. */
    title?: ReactNode;
    /**
     * One sentence under the title saying what the dialog is FOR — part of the
     * house card-box anatomy (icon → title → description), not decoration. A
     * title alone names the thing; it does not tell an admin why they are here.
     * Optional so the short confirm dialogs, whose `contentKey` IS the sentence,
     * stay unchanged.
     */
    descriptionKey?: string;
    descriptionKeyOptions?: Record<string, unknown>;
    /** Raw description node when the text is not an i18n key. Ignored if `descriptionKey` is set. */
    description?: ReactNode;
    cancelLabelKey?: string;
    okLabelKey?: string;
    contentKey?: string;
    contentKeyOptions?: Record<string, unknown>;
    children?: ReactNode;
    onConfirm?: () => void;
    onClose?: () => void;
    /**
     * Dismiss gestures (X button, Escape, mask click) when they must behave
     * differently from the Cancel text button — e.g. a sub-view whose Cancel
     * goes back one step while X closes the whole dialog. Defaults to
     * `onClose`, so existing dialogs keep one close path.
     */
    onDismiss?: () => void;
    /** Id of an element describing the confirm button (e.g. why it is disabled). */
    confirmDescribedBy?: string;
    /** Custom footer content; replaces the standard text-button actions. */
    footer?: ReactNode;
    width?: number | string;
    /** Optional 32px hero icon centered above the title (M3 basic dialog). */
    icon?: ReactNode;
    /** Full-width divider between content and actions. Defaults to true. */
    showDivider?: boolean;
    /** Disables the confirm text button (e.g. while submitting). */
    confirmDisabled?: boolean;
    /** Show the top-right close (X) affordance. Defaults to true. */
    closable?: boolean;
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
    title,
    descriptionKey,
    descriptionKeyOptions,
    description,
    okLabelKey,
    cancelLabelKey,
    children,
    onConfirm,
    onClose,
    onDismiss,
    confirmDescribedBy,
    contentKey,
    contentKeyOptions,
    footer,
    width,
    icon,
    showDivider = true,
    confirmDisabled = false,
    closable = true,
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
                <button
                    type="button"
                    aria-describedby={confirmDescribedBy}
                    className={classNames(styles.actionButton, styles.actionButtonPrimary)}
                    disabled={confirmDisabled}
                    onClick={onConfirm}
                >
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
                titleKey || title ? (
                    <div className={styles.titleBlock}>
                        {icon && (
                            <span className={styles.heroIcon} aria-hidden>
                                {icon}
                            </span>
                        )}
                        <div className={styles.title}>{titleKey ? t(titleKey, titleKeyOptions) : title}</div>
                        {(descriptionKey || description) && (
                            <p className={styles.description}>
                                {descriptionKey ? t(descriptionKey, descriptionKeyOptions) : description}
                            </p>
                        )}
                    </div>
                ) : null
            }
            open
            destroyOnClose
            centered
            maskClosable
            keyboard
            closable={closable}
            onCancel={onDismiss ?? onClose}
            footer={
                resolvedFooter ? (
                    <>
                        {showDivider && <div className={styles.divider} aria-hidden />}
                        {/* The Modal owns footer padding so custom footers can never sit
                            flush against the 28px rounded surface (which used to clip them). */}
                        <div className={styles.footerBody}>{resolvedFooter}</div>
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
