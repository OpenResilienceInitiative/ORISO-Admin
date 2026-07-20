import classNames from 'classnames';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { IconButton } from '../IconButton';
import styles from './styles.module.scss';

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
            d="M12 10.6 7.8 6.4 6.4 7.8 10.6 12l-4.2 4.2 1.4 1.4L12 13.4l4.2 4.2 1.4-1.4L13.4 12l4.2-4.2-1.4-1.4z"
            fill="currentColor"
        />
    </svg>
);

export interface PostalCodeRangeRowProps {
    from: string;
    until: string;
    onFromChange: (value: string) => void;
    onUntilChange: (value: string) => void;
    onRemove?: () => void;
    /** M3 error state on the `from` field (e.g. invalid / overlapping range). */
    error?: boolean;
    fromLabel?: string;
    untilLabel?: string;
    removeLabel?: string;
    className?: string;
}

/**
 * Postal-code catchment range (Figma Admin.ORISO 1-34785): a "from ↔ until" pair
 * of M3 fields with a filled circular delete. Composes FloatingLabelInput +
 * IconButton — the delete is the shared atom, not a bespoke control.
 */
export const PostalCodeRangeRow = ({
    from,
    until,
    onFromChange,
    onUntilChange,
    onRemove,
    error = false,
    fromLabel = 'from',
    untilLabel = 'until',
    removeLabel = 'Remove range',
    className,
}: PostalCodeRangeRowProps) => (
    <div className={classNames(styles.row, className)}>
        <FloatingLabelInput
            className={styles.field}
            label={fromLabel}
            error={error}
            value={from}
            inputMode="numeric"
            onChange={(e) => onFromChange(e.target.value)}
        />
        <span className={styles.separator} aria-hidden>
            ↔
        </span>
        <FloatingLabelInput
            className={styles.field}
            label={untilLabel}
            value={until}
            inputMode="numeric"
            onChange={(e) => onUntilChange(e.target.value)}
        />
        {onRemove && <IconButton variant="filled" icon={<CloseIcon />} ariaLabel={removeLabel} onClick={onRemove} />}
    </div>
);
