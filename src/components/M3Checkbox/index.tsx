import classNames from 'classnames';
import styles from './styles.module.scss';

interface M3CheckboxProps {
    checked?: boolean;
    disabled?: boolean;
    /** Accessible name; the visible label is rendered by the caller. */
    label: string;
    /**
     * Id of the element that EXPLAINS the box (rendered by the caller, like the
     * label). Announced after the accessible name, so a consent whose meaning
     * lives in a hint next to it is not read out as a bare sentence.
     */
    describedById?: string;
    className?: string;
    onChange?: (value: boolean) => void;
}

/**
 * Material-3 checkbox (18px container inside a 40px state-layer / touch target),
 * built to match the Figma design system alongside {@link M3Switch}. Colours are
 * driven by the M3/OrisoScheme CSS variables so it inherits the admin theme.
 */
export const M3Checkbox = ({
    checked = false,
    disabled = false,
    label,
    describedById,
    className,
    onChange,
}: M3CheckboxProps) => {
    const handleToggle = () => {
        if (disabled) {
            return;
        }

        onChange?.(!checked);
    };

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            aria-describedby={describedById}
            disabled={disabled}
            onClick={handleToggle}
            className={classNames(styles.checkbox, className)}
        >
            <span className={styles.stateLayer}>
                <span className={classNames(styles.box, { [styles.boxChecked]: checked })}>
                    {checked && (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                            <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="var(--m3-on-primary, #ffffff)" />
                        </svg>
                    )}
                </span>
            </span>
        </button>
    );
};
