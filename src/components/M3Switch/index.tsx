import classNames from 'classnames';
import styles from './styles.module.scss';

interface M3SwitchProps {
    checked?: boolean;
    disabled?: boolean;
    label: string;
    className?: string;
    onChange?: (value: boolean) => void;
}

export const M3Switch = ({ checked = false, disabled = false, label, className, onChange }: M3SwitchProps) => {
    const handleToggle = () => {
        if (disabled) {
            return;
        }

        onChange?.(!checked);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={handleToggle}
            className={classNames(styles.switchButton, className)}
        >
            {checked ? (
                <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect
                        x="4"
                        y="8"
                        width="52"
                        height="32"
                        rx="16"
                        fill="var(--m3-on-surface, #1B1B1C)"
                        fillOpacity="0.9"
                    />
                    <rect x="28" y="12" width="24" height="24" rx="12" fill="var(--m3-surface, #FCF9F9)" />
                    <path
                        d="M38.3669 28.0001L34.5669 24.2001L35.5169 23.2501L38.3669 26.1001L44.4836 19.9834L45.4336 20.9334L38.3669 28.0001Z"
                        fill="var(--m3-on-surface, #1B1B1C)"
                    />
                </svg>
            ) : (
                <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect
                        x="4"
                        y="8"
                        width="52"
                        height="32"
                        rx="16"
                        fill="var(--m3-surface-variant, #E0E3E3)"
                        fillOpacity="0.1"
                    />
                    <rect
                        x="5"
                        y="9"
                        width="50"
                        height="30"
                        rx="15"
                        stroke="var(--m3-on-surface, #1B1B1C)"
                        strokeOpacity="0.4"
                        strokeWidth="2"
                    />
                    <rect
                        x="8"
                        y="12"
                        width="24"
                        height="24"
                        rx="12"
                        fill="var(--m3-on-surface, #1B1B1C)"
                        fillOpacity="0.5"
                    />
                    <path
                        d="M16.2668 28.6668L15.3335 27.7335L19.0668 24.0002L15.3335 20.2668L16.2668 19.3335L20.0002 23.0668L23.7335 19.3335L24.6668 20.2668L20.9335 24.0002L24.6668 27.7335L23.7335 28.6668L20.0002 24.9335L16.2668 28.6668Z"
                        fill="var(--m3-surface-container-highest, #E4E2E2)"
                    />
                </svg>
            )}
        </button>
    );
};
