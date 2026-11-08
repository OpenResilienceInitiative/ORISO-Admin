import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as CloseIcon } from '../../resources/img/svg/oriso/snackbar_close_24px.svg';
import type { SnackbarAction, SnackbarSeverity } from './snackbarStore';
import styles from './Snackbar.module.scss';

/** An action label longer than this does not share the text line (Figma "Longer Action"). */
export const SNACKBAR_LONG_ACTION_LENGTH = 12;
/** Text longer than this (about three lines next to an action) puts the action on its own row. */
export const SNACKBAR_LONG_TEXT_LENGTH = 72;

const textLength = (node: ReactNode): number => (typeof node === 'string' ? node.length : 0);

export type SnackbarLayout = 'auto' | 'inline' | 'stacked';

export interface SnackbarProps {
    message: ReactNode;
    description?: ReactNode;
    /** Neutral (inverse surface, Figma) or a coloured tone for the message's meaning. */
    severity?: SnackbarSeverity;
    action?: SnackbarAction;
    /** Second text action, shown before `action`. Forces the stacked layout. */
    secondaryAction?: SnackbarAction;
    /**
     * "Ansehen": a text link under the message, never one of the action slots, so it can stay next to
     * two real actions. Stays out of the way of the live-region text (it is a button after it).
     */
    jump?: SnackbarAction;
    /** Shows the close affordance. */
    dismissible?: boolean;
    /**
     * `inline`: action next to the text (Figma single-line and two-line variants).
     * `stacked`: action on its own row below the text (Figma "longer action").
     * `auto` picks `stacked` for an action label over {@link SNACKBAR_LONG_ACTION_LENGTH} characters
     * or a text over {@link SNACKBAR_LONG_TEXT_LENGTH}.
     */
    layout?: SnackbarLayout;
    /** Called by the close affordance. */
    onClose?: () => void;
    /** Called after the action's own `onClick`, e.g. to close the snackbar. */
    onActionDone?: () => void;
    /** Accessible name of the close affordance. */
    closeLabel?: string;
    className?: string;
    /** Overrides the default `data-testid` (`snackbar`). */
    testId?: string;
}

/** Interaction state of a building block. Real use never sets it; the stories do, to show all four. */
export type SnackbarBlockState = 'enabled' | 'hovered' | 'focused' | 'pressed';

/** Figma Building Blocks/Snackbar-action: the text action, 40px high, 12px x 10px padding. */
export const SnackbarTextButton = ({
    children,
    onClick,
    state = 'enabled',
}: {
    children: ReactNode;
    onClick?: () => void;
    state?: SnackbarBlockState;
}) => (
    <button type="button" className={styles.action} data-state={state} onClick={onClick}>
        <span className={styles.stateLayer}>{children}</span>
    </button>
);

/** Figma Building Blocks/Snackbar-close-affordance: 48px target, 24px icon. */
export const SnackbarCloseButton = ({
    label,
    onClick,
    state = 'enabled',
}: {
    label: string;
    onClick?: () => void;
    state?: SnackbarBlockState;
}) => (
    <button type="button" className={styles.close} aria-label={label} data-state={state} onClick={onClick}>
        <span className={styles.closeContainer}>
            <span className={styles.closeStateLayer}>
                <CloseIcon className={styles.closeIcon} aria-hidden="true" focusable="false" />
            </span>
        </span>
    </button>
);

/**
 * Material 3 snackbar, ORISO Figma "Snackbar" (Design-System-M3_ORISO 53977:33575).
 * Presentational only: placement, queueing, timing and the live region belong to `<SnackbarHost>`,
 * which is fed by `snackbar.notify()`.
 */
export const Snackbar = ({
    message,
    description,
    severity = 'info',
    action,
    secondaryAction,
    jump,
    dismissible = false,
    layout = 'auto',
    onClose,
    onActionDone,
    closeLabel,
    className,
    testId = 'snackbar',
}: SnackbarProps) => {
    const { t } = useTranslation();
    const longText = textLength(message) + textLength(description) > SNACKBAR_LONG_TEXT_LENGTH;
    const stacked =
        (!!action || !!secondaryAction) &&
        (layout === 'stacked' ||
            !!secondaryAction ||
            (layout === 'auto' && ((action?.label.length ?? 0) > SNACKBAR_LONG_ACTION_LENGTH || longText)));
    const actionButton = action && (
        <SnackbarTextButton
            onClick={() => {
                action.onClick();
                onActionDone?.();
            }}
        >
            {action.label}
        </SnackbarTextButton>
    );
    const secondaryButton = secondaryAction && (
        <SnackbarTextButton
            onClick={() => {
                secondaryAction.onClick();
                onActionDone?.();
            }}
        >
            {secondaryAction.label}
        </SnackbarTextButton>
    );
    const closeButton = dismissible && (
        <SnackbarCloseButton label={closeLabel ?? t('snackbar.close')} onClick={onClose} />
    );
    const text = (
        <div className={styles.body}>
            <p className={styles.text}>
                {description ? (
                    <>
                        <span className={styles.title}>{message}</span>{' '}
                        <span className={styles.description}>{description}</span>
                    </>
                ) : (
                    message
                )}
            </p>
            {jump && (
                <button type="button" className={styles.jump} onClick={jump.onClick}>
                    {jump.label}
                </button>
            )}
        </div>
    );

    const classNames = [
        styles.snackbar,
        stacked ? styles.stacked : styles.inline,
        dismissible ? styles.hasClose : '',
        action || secondaryAction ? styles.hasAction : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    if (stacked) {
        return (
            <div className={classNames} data-severity={severity} data-layout="stacked" data-testid={testId}>
                {text}
                <div className={styles.controls}>
                    <div className={styles.actions}>
                        {secondaryButton}
                        {actionButton}
                    </div>
                    {closeButton}
                </div>
            </div>
        );
    }
    return (
        <div className={classNames} data-severity={severity} data-layout="inline" data-testid={testId}>
            {text}
            {(actionButton || closeButton) && (
                <div className={styles.controls}>
                    {actionButton}
                    {closeButton}
                </div>
            )}
        </div>
    );
};

export default Snackbar;
