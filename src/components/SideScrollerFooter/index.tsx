import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import classNames from 'classnames';
import styles from './styles.module.scss';

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
        <button
            className={classNames(styles.button, { [styles.active]: canScrollBackward })}
            type="button"
            aria-label={previousLabel}
            aria-controls={controlsId}
            disabled={!canScrollBackward}
            onClick={onScrollBackward}
        >
            <ArrowBackIcon />
        </button>
        {cardCount > 1 && (
            // The dots are a purely visual affordance: assistive technology
            // already reaches every card through the deck's list semantics.
            <div className={styles.positions} aria-hidden="true">
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
        )}
        <button
            className={classNames(styles.button, { [styles.active]: canScrollForward })}
            type="button"
            aria-label={nextLabel}
            aria-controls={controlsId}
            disabled={!canScrollForward}
            onClick={onScrollForward}
        >
            <ArrowForwardIcon />
        </button>
    </nav>
);
