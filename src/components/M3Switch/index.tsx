import classNames from 'classnames';
import styles from './styles.module.scss';

interface M3SwitchProps {
    /** Lets a visible <label htmlFor> pass clicks on its text to the switch. */
    id?: string;
    checked?: boolean;
    disabled?: boolean;
    label: string;
    className?: string;
    onChange?: (value: boolean) => void;
}

const SELECTED_FILL = 'var(--admin-control-selected, var(--m3-primary, #A5000A))';
const WHITE_THUMB = 'var(--m3-on-primary, #FFFFFF)';
/**
 * Same switch as the Frontend Storybook (`Atoms/Switch`, #1374): a tonal track with
 * a full-strength 2px outline (≥3:1 against the tile surface, WCAG 1.4.11) and an
 * outline-coloured knob carrying a light ✕. On: brand track, white knob, brand ✓.
 */
const OFF_TRACK_FILL = 'var(--m3-surface-container-highest, #E4E2E2)';
const OFF_TRACK_STROKE = 'var(--m3-outline, #747878)';
const OFF_THUMB_FILL = 'var(--m3-outline, #747878)';
const OFF_GLYPH_FILL = 'var(--m3-surface-container-highest, #E4E2E2)';
/** Disabled = unavailable, as in the Frontend: M3 disabled opacities on the on-surface colour. */
const DISABLED_INK = 'var(--m3-on-surface, #1B1B1C)';
const DISABLED_TRACK_FILL = 'var(--m3-surface-variant, #E0E3E3)';
const DISABLED_SURFACE = 'var(--m3-surface, #FCF9F9)';

const CHECK_PATH =
    'M38.3669 28.0001L34.5669 24.2001L35.5169 23.2501L38.3669 26.1001L44.4836 19.9834L45.4336 20.9334L38.3669 28.0001Z';
const CROSS_PATH =
    'M16.2668 28.6668L15.3335 27.7335L19.0668 24.0002L15.3335 20.2668L16.2668 19.3335L20.0002 23.0668L23.7335 19.3335L24.6668 20.2668L20.9335 24.0002L24.6668 27.7335L23.7335 28.6668L20.0002 24.9335L16.2668 28.6668Z';

// The 24px knob spans y 12–36 inside the y 8–40 track: centred in both states.
const OnEnabledIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="52" height="32" rx="16" fill={SELECTED_FILL} />
        <rect x="28" y="12" width="24" height="24" rx="12" fill={WHITE_THUMB} />
        <path d={CHECK_PATH} fill={SELECTED_FILL} />
    </svg>
);

/** OFF: tonal track with the 2px outline drawn inside the 52×32 box, outline-coloured knob with ✕ on the left. */
const OffIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="52" height="32" rx="16" fill={OFF_TRACK_FILL} />
        <rect x="5" y="9" width="50" height="30" rx="15" stroke={OFF_TRACK_STROKE} strokeWidth="2" />
        <rect x="8" y="12" width="24" height="24" rx="12" fill={OFF_THUMB_FILL} />
        <path d={CROSS_PATH} fill={OFF_GLYPH_FILL} />
    </svg>
);

/** OFF + disabled: faint track and outline, 38 % knob with ✕ (Frontend disabled palette). */
const OffDisabledIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="52" height="32" rx="16" fill={DISABLED_TRACK_FILL} fillOpacity="0.1" />
        <rect x="5" y="9" width="50" height="30" rx="15" stroke={DISABLED_INK} strokeOpacity="0.1" strokeWidth="2" />
        <rect x="8" y="12" width="24" height="24" rx="12" fill={DISABLED_INK} fillOpacity="0.38" />
        <path d={CROSS_PATH} fill={DISABLED_SURFACE} fillOpacity="0.75" />
    </svg>
);

/** ON + disabled: neutral 10 % track (not brand red), surface knob with a 38 % ✓ on the right. */
const OnDisabledIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="52" height="32" rx="16" fill={DISABLED_INK} fillOpacity="0.1" />
        <rect x="28" y="12" width="24" height="24" rx="12" fill={DISABLED_SURFACE} />
        <path d={CHECK_PATH} fill={DISABLED_INK} fillOpacity="0.38" />
    </svg>
);

const switchIcon = (checked: boolean, disabled: boolean) => {
    if (disabled) {
        return checked ? <OnDisabledIcon /> : <OffDisabledIcon />;
    }
    return checked ? <OnEnabledIcon /> : <OffIcon />;
};

export const M3Switch = ({ id, checked = false, disabled = false, label, className, onChange }: M3SwitchProps) => {
    const handleToggle = () => {
        if (disabled) {
            return;
        }

        onChange?.(!checked);
    };

    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={handleToggle}
            className={classNames(styles.switchButton, className)}
        >
            {switchIcon(checked, disabled)}
        </button>
    );
};
