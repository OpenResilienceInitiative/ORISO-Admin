import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import classNames from 'classnames';
import styles from './styles.module.scss';

interface SideScrollerFooterProps {
    ariaLabel: string;
    canScrollBackward: boolean;
    canScrollForward: boolean;
    className?: string;
    controlsId?: string;
    'data-admin-card-deck-footer'?: boolean;
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
    'data-admin-card-deck-footer': dataAdminCardDeckFooter,
    nextLabel,
    onScrollBackward,
    onScrollForward,
    previousLabel,
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
