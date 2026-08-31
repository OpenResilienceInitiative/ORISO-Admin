import { useState, type ReactNode } from 'react';
import { Dropdown, type DropdownProps, type MenuProps } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ChevronDownIcon } from '../../resources/img/svg/oriso/keyboard_arrow_down_24px.svg';
import styles from './splitButton.module.scss';

/**
 * Colour variants per the M3 spec sheet (Figma 57994-15744):
 * - `filled`: brand surface — the page's main CTA (alias: `primary`).
 * - `tonal`: M3 secondary container — resting actions that are not the CTA
 *   (alias: `secondary`).
 * - `outlined`: transparent with outline — the default resting look.
 * - `elevated`: light container with primary text and a resting shadow. The
 *   shadow is this variant's identity — never use it just for the light fill.
 */
export type SplitButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated' | 'primary' | 'secondary';

/** Size scale per the M3 spec sheet: 32/40/56/96/136px container heights. */
export type SplitButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

/** Legacy variant names map onto the sheet's vocabulary. */
const VARIANT_ALIASES: Partial<Record<SplitButtonVariant, SplitButtonVariant>> = {
    primary: 'filled',
    secondary: 'tonal',
};

export interface SplitButtonProps {
    /** Main segment content (action label). */
    label: ReactNode;
    /** Leading icon, sized by the size scale, inherits the segment text colour. */
    icon?: ReactNode;
    /** Colour variant, see {@link SplitButtonVariant}. */
    variant?: SplitButtonVariant;
    /**
     * M3 size (XSmall 32px … XLarge 136px). Defaults to `medium` — the 56px
     * geometry every existing caller was built against.
     */
    size?: SplitButtonSize;
    /**
     * Controlled open state of the chevron menu — pass it only when the caller
     * (a story, a test) must pin the open appearance; leave it out for the
     * normal self-managed dropdown.
     */
    open?: boolean;
    disabled?: boolean;
    /**
     * Disables only the main (action) segment while the chevron menu stays
     * interactive — e.g. the invite composer's send button, whose action is
     * gated on form validity but whose send-mode menu must remain reachable.
     */
    mainDisabled?: boolean;
    /**
     * Id of an element describing the main segment — used to attach the reason
     * a disabled action is disabled without touching its accessible NAME (which
     * stays the visible label, so tests and screen readers still find it by it).
     */
    mainDescribedBy?: string;
    /** Pressing the main segment triggers the action itself. */
    onClick?: () => void;
    /** Dropdown menu opened by the chevron segment (secondary options). */
    menu?: MenuProps;
    /** Accessible label for the chevron segment. */
    menuLabel?: string;
    /**
     * Accessible name / tooltip of the main segment when the visible label is a
     * bare value (e.g. the selection count "23", where the label alone does not
     * say what pressing it does).
     */
    title?: string;
    /**
     * Adds a third, up-chevron segment that undoes the state the button shows —
     * used by the bulk-selection counter to clear the selection. Omit it and the
     * button keeps its two segments.
     */
    onCollapse?: () => void;
    /** Accessible name of the up-chevron segment. Required whenever `onCollapse` is set. */
    collapseLabel?: string;
    className?: string;
}

/**
 * Material-3 split button (Figma 1165:16407): a main action segment and a
 * separate chevron segment sharing one pill silhouette — same 56px geometry as
 * {@link PillSelect}. The main segment fires the action, the chevron opens the
 * secondary-options menu. Colours come from the M3 CSS variables only.
 */
export const SplitButton = ({
    label,
    icon,
    variant = 'outlined',
    size = 'medium',
    open: openProp,
    disabled = false,
    mainDisabled = false,
    mainDescribedBy,
    onClick,
    menu,
    menuLabel,
    title,
    onCollapse,
    collapseLabel,
    className,
}: SplitButtonProps) => {
    const { t } = useTranslation();
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = !disabled && (openProp ?? uncontrolledOpen);
    const resolvedVariant = VARIANT_ALIASES[variant] ?? variant;

    const handleOpenChange: Required<DropdownProps>['onOpenChange'] = (nextOpen) => setUncontrolledOpen(nextOpen);

    const segments = (
        <span
            className={classNames(
                styles.splitButton,
                styles[size],
                styles[resolvedVariant],
                {
                    [styles.disabled]: disabled,
                    [styles.open]: open,
                },
                className,
            )}
        >
            <button
                type="button"
                aria-label={title}
                aria-describedby={mainDescribedBy}
                className={classNames(styles.segment, styles.main)}
                disabled={disabled || mainDisabled}
                title={title}
                onClick={onClick}
            >
                {icon && (
                    <span className={styles.icon} aria-hidden>
                        {icon}
                    </span>
                )}
                <span className={styles.label}>{label}</span>
            </button>
            {menu && (
                <Dropdown
                    trigger={['click']}
                    disabled={disabled}
                    open={open}
                    onOpenChange={handleOpenChange}
                    menu={menu}
                    // The sheet carries the same, one step higher shadow as the
                    // button it grew out of, so the two read as one surface.
                    overlayClassName={styles.menuOverlay}
                >
                    <button
                        type="button"
                        className={classNames(styles.segment, styles.chevron)}
                        disabled={disabled}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        aria-label={menuLabel ?? t('globalSearch.moreOptions', 'Weitere Optionen')}
                    >
                        <ChevronDownIcon className={styles.chevronIcon} aria-hidden />
                    </button>
                </Dropdown>
            )}
            {/* Third segment (Figma 1165:16407 selection variant): the counter
                pairs its menu chevron with an up-chevron that undoes the state
                the counter represents. A segment without a purpose we can name
                does not ship, so it is opt-in via `onCollapse`. */}
            {onCollapse && (
                <button
                    type="button"
                    aria-label={collapseLabel}
                    className={classNames(styles.segment, styles.chevron, styles.collapse)}
                    disabled={disabled}
                    title={collapseLabel}
                    onClick={onCollapse}
                >
                    <ChevronDownIcon className={classNames(styles.chevronIcon, styles.chevronUp)} aria-hidden />
                </button>
            )}
        </span>
    );

    return segments;
};
