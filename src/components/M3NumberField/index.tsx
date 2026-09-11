import { ChangeEvent, KeyboardEvent, ReactNode, useEffect, useId, useState } from 'react';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
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
    /** Keeps the value non-editable while preserving the stepper controls. */
    readOnly?: boolean;
    className?: string;
    /** Accessible name for the input; falls back to `label`. */
    'aria-label'?: string;
    /**
     * Non-numeric text shown in the value slot instead of `value` (e.g. "Auto"
     * while an id is allocated automatically). Typing digits into it reports
     * just those digits via `onChange`; clearing it reports `undefined`.
     */
    displayText?: string;
    /**
     * External stepping override: when set, the chevron buttons and the
     * ArrowUp/ArrowDown keys call this instead of the internal ±`step` math
     * (used for free-ID navigation that skips taken ids, #570).
     */
    onStep?: (direction: 1 | -1) => void;
    /** Disable one stepper direction independently of min/max (e.g. no free id upwards). */
    stepUpDisabled?: boolean;
    stepDownDisabled?: boolean;
    /** Renders the field in the M3 error state (error-coloured content) and sets `aria-invalid`. */
    error?: boolean;
    /** Supporting text below the field; shown in the error colour while `error` is set. */
    supportingText?: ReactNode;
    /** Trailing slot inside the main segment (e.g. an Auto toggle chip). */
    trailing?: ReactNode;
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
    readOnly = false,
    className,
    'aria-label': ariaLabel,
    displayText,
    onStep,
    stepUpDisabled = false,
    stepDownDisabled = false,
    error = false,
    supportingText,
    trailing,
}: M3NumberFieldProps) => {
    const { t } = useTranslation();
    const inputId = useId();
    const supportingTextId = `${inputId}-supporting-text`;
    const [draft, setDraft] = useState(value === undefined ? '' : String(value));

    useEffect(() => {
        setDraft(value === undefined ? '' : String(value));
    }, [value]);

    const displayMode = displayText !== undefined;
    const parsedDraft = NUMERIC_PATTERN.test(draft) && draft !== '' && draft !== '-' ? Number(draft) : undefined;
    const currentValue = value ?? parsedDraft;
    const hasValue = displayMode || draft !== '';
    const atMin = typeof min === 'number' && currentValue !== undefined && currentValue <= min;
    const atMax = typeof max === 'number' && currentValue !== undefined && currentValue >= max;
    // With an external stepper the min/max short-circuit does not apply — the
    // parent decides reachability (e.g. "no free id in that direction").
    const downDisabled = disabled || stepDownDisabled || (!onStep && atMin);
    const upDisabled = disabled || stepUpDisabled || (!onStep && atMax);

    const commit = (next: number) => {
        setDraft(String(next));

        if (next !== value) {
            onChange?.(next);
        }
    };

    const adjust = (direction: 1 | -1) => {
        if (disabled || (direction === 1 ? upDisabled : downDisabled)) {
            return;
        }

        if (onStep) {
            onStep(direction);
            return;
        }

        const base = currentValue ?? (typeof min === 'number' ? min : 0);
        const next = clamp(currentValue === undefined ? base : base + direction * step, min, max);
        commit(next);
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;

        if (displayMode) {
            // The user typed into (or cleared) the display text: only the digits
            // count — "Auto3" → 3 — and the parent decides what mode that means.
            const digits = raw.replace(/\D/g, '');
            if (digits === '') {
                if (raw === '') onChange?.(undefined);
                return;
            }
            onChange?.(Number(digits));
            return;
        }

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
        if (displayMode || parsedDraft === undefined) {
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
        <div className={classNames(styles.root, className)}>
            <div
                className={classNames(styles.field, styles[variant], {
                    [styles.fieldDisabled]: disabled,
                    [styles.fieldError]: error,
                })}
            >
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
                            value={displayMode ? displayText : draft}
                            placeholder={label}
                            aria-label={ariaLabel ?? label}
                            aria-invalid={error || undefined}
                            aria-describedby={supportingText != null ? supportingTextId : undefined}
                            disabled={disabled}
                            readOnly={readOnly}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                        />
                    </span>
                    {trailing && <span className={styles.trailing}>{trailing}</span>}
                </label>
                <button
                    type="button"
                    className={styles.stepper}
                    aria-label={t('m3NumberField.decrease', 'Wert verringern')}
                    disabled={downDisabled}
                    onClick={() => adjust(-1)}
                >
                    <ChevronDownIcon className={styles.chevronIcon} aria-hidden />
                </button>
                <button
                    type="button"
                    className={classNames(styles.stepper, styles.stepperUp)}
                    aria-label={t('m3NumberField.increase', 'Wert erhöhen')}
                    disabled={upDisabled}
                    onClick={() => adjust(1)}
                >
                    <ChevronUpIcon className={styles.chevronIcon} aria-hidden />
                </button>
            </div>
            {supportingText != null && (
                <span
                    aria-live={error ? 'assertive' : 'polite'}
                    className={styles.supportingText}
                    id={supportingTextId}
                    role={error ? 'alert' : undefined}
                >
                    {supportingText}
                </span>
            )}
        </div>
    );
};

export type M3DurationFieldProps = {
    value?: number;
    onChange?: (minutes: number | undefined) => void;
    label: string;
    disabled?: boolean;
    readOnly?: boolean;
    className?: string;
};

const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours === 0) return `${remainder} min`;
    if (remainder === 0) return `${hours} h`;
    return `${hours} h ${remainder} min`;
};

/**
 * Case-handover duration control: 15 minute minimum/step, 180 minute default and deliberately
 * no product maximum. The value is formatted for reading while the split buttons remain the
 * single editing path, matching the Figma timer field.
 */
export const M3DurationField = ({
    value = 180,
    onChange,
    label,
    disabled = false,
    readOnly = false,
    className,
}: M3DurationFieldProps) => (
    <M3NumberField
        className={className}
        label={label}
        value={value}
        displayText={formatDuration(value)}
        icon={<AccessTimeFilledIcon />}
        min={15}
        step={15}
        disabled={disabled}
        readOnly={readOnly}
        stepUpDisabled={readOnly}
        stepDownDisabled={readOnly}
        onChange={onChange}
    />
);
