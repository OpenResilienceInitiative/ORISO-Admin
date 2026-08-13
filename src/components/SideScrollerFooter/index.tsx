import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import classNames from 'classnames';
import styles from './styles.module.scss';

export type SideScrollerDirection = 'backward' | 'forward';

interface SideScrollerButtonProps {
    className?: string;
    controlsId?: string;
    direction: SideScrollerDirection;
    /**
     * Flattens the outer side of the pill so the button can sit flush against a
     * viewport edge — the shape used by the page header rail (Figma 1626:28416 /
     * 1626:28426). Free-standing footers keep the full pill.
     */
    edgeAnchored?: boolean;
    enabled: boolean;
    label: string;
    onClick: () => void;
}

/**
 * The single arrow control shared by both scroll navigations: the free-standing
 * `SideScrollerFooter` (in-card scrollers such as the theme preview) and the
 * page header rail that drives the current CardDeck.
 */
export const SideScrollerButton = ({
    className,
    controlsId,
    direction,
    edgeAnchored = false,
    enabled,
    label,
    onClick,
}: SideScrollerButtonProps) => {
    const Icon = direction === 'backward' ? ArrowBackIcon : ArrowForwardIcon;

    return (
        <button
            className={classNames(styles.button, className, {
                [styles.active]: enabled,
                [styles.edgeStart]: edgeAnchored && direction === 'backward',
                [styles.edgeEnd]: edgeAnchored && direction === 'forward',
            })}
            type="button"
            aria-label={label}
            aria-controls={controlsId}
            disabled={!enabled}
            onClick={onClick}
        >
            <Icon />
        </button>
    );
};

interface SideScrollerFooterProps {
    ariaLabel: string;
    canScrollBackward: boolean;
    canScrollForward: boolean;
    className?: string;
    controlsId?: string;
    nextLabel: string;
    onScrollBackward: () => void;
    onScrollForward: () => void;
    previousLabel: string;
}

export const SideScrollerFooter = ({
    ariaLabel,
    canScrollBackward,
    canScrollForward,
    className,
    controlsId,
    nextLabel,
    onScrollBackward,
    onScrollForward,
    previousLabel,
}: SideScrollerFooterProps) => (
    <nav className={classNames(styles.footer, className)} aria-label={ariaLabel}>
        <SideScrollerButton
            controlsId={controlsId}
            direction="backward"
            enabled={canScrollBackward}
            label={previousLabel}
            onClick={onScrollBackward}
        />
        <SideScrollerButton
            controlsId={controlsId}
            direction="forward"
            enabled={canScrollForward}
            label={nextLabel}
            onClick={onScrollForward}
        />
    </nav>
);
