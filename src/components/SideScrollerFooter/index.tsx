import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import classNames from 'classnames';
import styles from './styles.module.scss';

interface SideScrollerFooterProps {
    ariaLabel: string;
    canScrollBackward: boolean;
    canScrollForward: boolean;
    className?: string;
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
    nextLabel,
    onScrollBackward,
    onScrollForward,
    previousLabel,
}: SideScrollerFooterProps) => (
    <div className={classNames(styles.footer, className)} aria-label={ariaLabel}>
        <button
            className={classNames(styles.button, { [styles.active]: canScrollBackward })}
            type="button"
            aria-label={previousLabel}
            disabled={!canScrollBackward}
            onClick={onScrollBackward}
        >
            <ArrowBackIcon />
        </button>
        <button
            className={classNames(styles.button, { [styles.active]: canScrollForward })}
            type="button"
            aria-label={nextLabel}
            disabled={!canScrollForward}
            onClick={onScrollForward}
        >
            <ArrowForwardIcon />
        </button>
    </div>
);
