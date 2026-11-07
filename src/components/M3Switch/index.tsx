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
 * Off/disabled palette (#1374): a tonal track with a full-strength 2px outline
 * (≥3:1 against the tile surface, WCAG 1.4.11) and a dark knob carrying a light
 * glyph. The old 10 % fill / 40 % stroke / 50 % knob read as near-white on white.
 */
const OFF_TRACK_FILL = 'var(--m3-surface-container-highest, #E4E2E2)';
const OFF_TRACK_STROKE = 'var(--m3-outline, #747878)';
const OFF_THUMB_FILL = 'var(--m3-on-surface-variant, #444748)';
const OFF_GLYPH_FILL = 'var(--m3-surface-container-highest, #E4E2E2)';

const CHECK_PATH =
    'M38.3669 28.0001L34.5669 24.2001L35.5169 23.2501L38.3669 26.1001L44.4836 19.9834L45.4336 20.9334L38.3669 28.0001Z';
const CROSS_PATH =
    'M16.2668 28.6668L15.3335 27.7335L19.0668 24.0002L15.3335 20.2668L16.2668 19.3335L20.0002 23.0668L23.7335 19.3335L24.6668 20.2668L20.9335 24.0002L24.6668 27.7335L23.7335 28.6668L20.0002 24.9335L16.2668 28.6668Z';

/** Tonal track with the 2px outline drawn inside the 52×32 track box. */
const OffTrack = () => (
    <>
        <rect x="4" y="8" width="52" height="32" rx="16" fill={OFF_TRACK_FILL} />
        <rect x="5" y="9" width="50" height="30" rx="15" stroke={OFF_TRACK_STROKE} strokeWidth="2" />
    </>
);

// The 24px knob spans y 12–36 inside the y 8–40 track: centred in both states.
const OnEnabledIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="52" height="32" rx="16" fill={SELECTED_FILL} />
        <rect x="28" y="12" width="24" height="24" rx="12" fill={WHITE_THUMB} />
        <path d={CHECK_PATH} fill={SELECTED_FILL} />
    </svg>
);

/** ON + disabled: neutral track (not brand red), dark knob with ✓ on the right; the button dims it. */
const OnDisabledIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <OffTrack />
        <rect x="28" y="12" width="24" height="24" rx="12" fill={OFF_THUMB_FILL} />
        <path d={CHECK_PATH} fill={OFF_GLYPH_FILL} />
    </svg>
);

/** OFF: dark knob with ✕ on the left (enabled and disabled share the SVG; the button dims disabled). */
const OffIcon = () => (
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <OffTrack />
        <rect x="8" y="12" width="24" height="24" rx="12" fill={OFF_THUMB_FILL} />
        <path d={CROSS_PATH} fill={OFF_GLYPH_FILL} />
    </svg>
);

const switchIcon = (checked: boolean, disabled: boolean) => {
    if (!checked) {
        return <OffIcon />;
    }
    if (disabled) {
        return <OnDisabledIcon />;
    }
    return <OnEnabledIcon />;
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
