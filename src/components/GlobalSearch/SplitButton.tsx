import { useState, type ReactNode } from 'react';
import { Dropdown, type DropdownProps, type MenuProps } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ChevronDownIcon } from '../../resources/img/svg/oriso/keyboard_arrow_down_24px.svg';
import styles from './splitButton.module.scss';

export interface SplitButtonProps {
    /** Main segment content (action label). */
    label: ReactNode;
    /** Leading icon (24px), inherits the segment text colour. */
    icon?: ReactNode;
    /**
     * Visual variant per the Figma composer spec: `tonal` = light fill with
     * primary text (e.g. template picker), `primary` = filled brand surface
     * (e.g. send). Use `outlined` for the resting/not-ready state — the caller
     * flips to `primary` once the form is validly filled.
     */
    variant?: 'outlined' | 'tonal' | 'secondary' | 'primary';
    disabled?: boolean;
    /**
     * Disables only the main (action) segment while the chevron menu stays
     * interactive — e.g. the invite composer's send button, whose action is
     * gated on form validity but whose send-mode menu must remain reachable.
     */
    mainDisabled?: boolean;
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
    disabled = false,
    mainDisabled = false,
    onClick,
    menu,
    menuLabel,
    title,
    className,
}: SplitButtonProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const handleOpenChange: Required<DropdownProps>['onOpenChange'] = (nextOpen) => setOpen(nextOpen);

    const segments = (
        <span
            className={classNames(
                styles.splitButton,
                {
                    [styles.tonal]: variant === 'tonal',
                    [styles.secondary]: variant === 'secondary',
                    [styles.primary]: variant === 'primary',
                    [styles.disabled]: disabled,
                    [styles.open]: open && !disabled,
                },
                className,
            )}
        >
            <button
                type="button"
                aria-label={title}
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
                    open={!disabled && open}
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
                        aria-expanded={!disabled && open}
                        aria-label={menuLabel ?? t('globalSearch.moreOptions', 'Weitere Optionen')}
                    >
                        <ChevronDownIcon className={styles.chevronIcon} aria-hidden />
                    </button>
                </Dropdown>
            )}
        </span>
    );

    return segments;
};
