import type { ReactNode } from 'react';
import classNames from 'classnames';
import { M3Switch } from '../M3Switch';
import { M3Checkbox } from '../M3Checkbox';
import { Typography } from '../Typography';
import styles from './styles.module.scss';

export interface ToggleRowProps {
    /** Visible row label. */
    label: ReactNode;
    /** Accessible name for the controls when `label` is not a plain string. */
    ariaLabel?: string;
    /** Optional secondary description under the label. */
    description?: ReactNode;
    /** Trailing switch state. */
    checked?: boolean;
    onCheckedChange?: (next: boolean) => void;
    switchDisabled?: boolean;
    /** Show a leading M3 checkbox (Case-takeover "Activated" / opt-out pattern). */
    checkbox?: boolean;
    checkboxChecked?: boolean;
    onCheckboxChange?: (next: boolean) => void;
    checkboxDisabled?: boolean;
    className?: string;
}

/**
 * M3 toggle row (Figma Admin.ORISO — Case takeover / Avatar cards): an optional
 * leading checkbox, a label (+ optional description), and a trailing switch.
 * Composes the existing M3Checkbox + M3Switch atoms rather than restyling them.
 */
export const ToggleRow = ({
    label,
    ariaLabel,
    description,
    checked = false,
    onCheckedChange,
    switchDisabled = false,
    checkbox = false,
    checkboxChecked = false,
    onCheckboxChange,
    checkboxDisabled = false,
    className,
}: ToggleRowProps) => {
    const name = ariaLabel ?? (typeof label === 'string' ? label : 'toggle');
    return (
        <div className={classNames(styles.row, className)}>
            <div className={styles.lead}>
                {checkbox && (
                    <M3Checkbox
                        label={name}
                        checked={checkboxChecked}
                        disabled={checkboxDisabled}
                        onChange={onCheckboxChange}
                    />
                )}
                <div className={styles.text}>
                    <Typography variant="body-large" as="span">
                        {label}
                    </Typography>
                    {description && (
                        <Typography variant="body-small" as="span" color="var(--m3-on-surface-variant, #444748)">
                            {description}
                        </Typography>
                    )}
                </div>
            </div>
            <M3Switch label={name} checked={checked} disabled={switchDisabled} onChange={onCheckedChange} />
        </div>
    );
};
