import { ChangeEvent, KeyboardEvent, ReactNode, useEffect, useId, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ChevronDownIcon } from '../../resources/img/svg/oriso/keyboard_arrow_down_24px.svg';
import { ReactComponent as ChevronUpIcon } from '../../resources/img/svg/oriso/keyboard_arrow_up_24px.svg';
import styles from './styles.module.scss';

export type M3NumberFieldVariant = 'outlined' | 'tonal' | 'filled' | 'primary';

interface M3NumberFieldProps {
    value?: number;
    onChange?: (value: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
    /** Visible label; shown as placeholder while empty, floats above the value once filled. */
    label: string;
    /** Optional leading icon inside the main segment (rendered decorative). */
    icon?: ReactNode;
    variant?: M3NumberFieldVariant;
    disabled?: boolean;
    className?: string;
    /** Accessible name for the input; falls back to `label`. */
    'aria-label'?: string;
}

/** Integers only (optional leading minus); everything else is ignored while typing. */
const NUMERIC_PATTERN = /^-?\d*$/;

const clamp = (candidate: number, min?: number, max?: number): number => {
    let result = candidate;

    if (typeof min === 'number') {
        result = Math.max(min, result);
    }

    if (typeof max === 'number') {
        result = Math.min(max, result);
    }

    return result;
};

/**
 * Material-3 number field ("Number Button" in the Figma design system): a pill-shaped
 * grouped control with a main segment (icon + label / value) and two split stepper
 * buttons (chevron-down = decrement, chevron-up = increment), matching the
 * "Redesign Number Field" Figma section. Colours come exclusively from the
 * M3/OrisoScheme CSS variables so the control inherits the admin theme.
 */
export const M3NumberField = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    label,
    icon,
    variant = 'outlined',
    disabled = false,
    className,
    'aria-label': ariaLabel,
}: M3NumberFieldProps) => {
    const { t } = useTranslation();
    const inputId = useId();
    const [draft, setDraft] = useState(value === undefined ? '' : String(value));

    useEffect(() => {
        setDraft(value === undefined ? '' : String(value));
    }, [value]);

    const parsedDraft = NUMERIC_PATTERN.test(draft) && draft !== '' && draft !== '-' ? Number(draft) : undefined;
    const currentValue = value ?? parsedDraft;
    const hasValue = draft !== '';
    const atMin = typeof min === 'number' && currentValue !== undefined && currentValue <= min;
    const atMax = typeof max === 'number' && currentValue !== undefined && currentValue >= max;

    const commit = (next: number) => {
        setDraft(String(next));

        if (next !== value) {
            onChange?.(next);
        }
    };

    const adjust = (direction: 1 | -1) => {
        if (disabled) {
            return;
        }

        const base = currentValue ?? (typeof min === 'number' ? min : 0);
        const next = clamp(currentValue === undefined ? base : base + direction * step, min, max);
        commit(next);
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;

        if (!NUMERIC_PATTERN.test(raw)) {
            return;
        }

        setDraft(raw);

        if (raw === '' || raw === '-') {
            onChange?.(undefined);
            return;
        }

        onChange?.(Number(raw));
    };

    const handleInputBlur = () => {
        if (parsedDraft === undefined) {
            return;
        }

        const clamped = clamp(parsedDraft, min, max);

        if (clamped !== parsedDraft) {
            commit(clamped);
        }
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        event.preventDefault();
        adjust(event.key === 'ArrowUp' ? 1 : -1);
    };

    return (
        <div className={classNames(styles.field, styles[variant], { [styles.fieldDisabled]: disabled }, className)}>
            <label className={styles.main} htmlFor={inputId}>
                {icon && (
                    <span className={styles.icon} aria-hidden>
                        {icon}
                    </span>
                )}
                <span className={styles.textStack}>
                    {hasValue && <span className={styles.miniLabel}>{label}</span>}
                    <input
                        id={inputId}
                        className={styles.input}
                        type="text"
                        inputMode="numeric"
                        value={draft}
                        placeholder={label}
                        aria-label={ariaLabel ?? label}
                        disabled={disabled}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                    />
                </span>
            </label>
            <button
                type="button"
                className={styles.stepper}
                aria-label={t('m3NumberField.decrease', 'Wert verringern')}
                disabled={disabled || atMin}
                onClick={() => adjust(-1)}
            >
                <ChevronDownIcon className={styles.chevronIcon} aria-hidden />
            </button>
            <button
                type="button"
                className={classNames(styles.stepper, styles.stepperUp)}
                aria-label={t('m3NumberField.increase', 'Wert erhöhen')}
                disabled={disabled || atMax}
                onClick={() => adjust(1)}
            >
                <ChevronUpIcon className={styles.chevronIcon} aria-hidden />
            </button>
        </div>
    );
};
