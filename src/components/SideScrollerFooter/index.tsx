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

interface SideScrollerDotsProps {
    className?: string;
    // #568: one dot per card so off-screen cards stay discoverable without
    // knowing what the corner arrows do.
    cardCount: number;
    firstVisibleCard?: number;
    visibleCardCount?: number;
}

/**
 * The position indicator of a horizontal scroller. Lives next to the arrows in
 * a footer, and on its own under a CardDeck whose arrows sit in the page header.
 */
export const SideScrollerDots = ({
    className,
    cardCount,
    firstVisibleCard = 0,
    visibleCardCount = 1,
}: SideScrollerDotsProps) => (
    // The dots are a purely visual affordance: assistive technology already
    // reaches every card through the deck's list semantics.
    <div className={classNames(styles.positions, className)} aria-hidden="true">
        {Array.from({ length: cardCount }, (_, index) => {
            const active = index >= firstVisibleCard && index < firstVisibleCard + visibleCardCount;

            return (
                <span
                    key={`card-position-${index}`}
                    className={classNames(styles.dot, { [styles.dotActive]: active })}
                    data-admin-card-deck-dot={active ? 'active' : 'inactive'}
                />
            );
        })}
    </div>
);

interface SideScrollerFooterProps {
    ariaLabel: string;
    canScrollBackward: boolean;
    canScrollForward: boolean;
    // #568: one dot per card so off-screen cards stay discoverable without
    // knowing what the corner arrows do.
    cardCount?: number;
    className?: string;
    controlsId?: string;
    'data-admin-card-deck-footer'?: boolean;
    firstVisibleCard?: number;
    nextLabel: string;
    onScrollBackward: () => void;
    onScrollForward: () => void;
    previousLabel: string;
    visibleCardCount?: number;
}

export const SideScrollerFooter = ({
    ariaLabel,
    canScrollBackward,
    canScrollForward,
    cardCount = 0,
    className,
    controlsId,
    'data-admin-card-deck-footer': dataAdminCardDeckFooter,
    firstVisibleCard = 0,
    nextLabel,
    onScrollBackward,
    onScrollForward,
    previousLabel,
    visibleCardCount = 1,
}: SideScrollerFooterProps) => (
    <nav
        className={classNames(styles.footer, className)}
        aria-label={ariaLabel}
        data-admin-card-deck-footer={dataAdminCardDeckFooter || undefined}
    >
        <SideScrollerButton
            controlsId={controlsId}
            direction="backward"
            enabled={canScrollBackward}
            label={previousLabel}
            onClick={onScrollBackward}
        />
        {cardCount > 1 && (
            <SideScrollerDots
                cardCount={cardCount}
                firstVisibleCard={firstVisibleCard}
                visibleCardCount={visibleCardCount}
            />
        )}
        <SideScrollerButton
            controlsId={controlsId}
            direction="forward"
            enabled={canScrollForward}
            label={nextLabel}
            onClick={onScrollForward}
        />
    </nav>
);
