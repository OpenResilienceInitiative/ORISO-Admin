import { useRef, useState } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { ArrowDropDown } from '@mui/icons-material';
import styles from './M3RichTextEditor.module.scss';

export type SplitDropdownProps = {
    icon: React.ReactNode;
    label: React.ReactNode;
    menu: MenuProps;
    title?: string;
    /** Visible native tooltip, independent of the control's accessible name. */
    tooltip?: string;
    className?: string;
    /**
     * Read-only surfaces keep the control visible but inert (admin design rule:
     * disable, never hide — a picker that vanishes hides what the level offers).
     * Also blocks opening the menu while a save that a switch could race is in flight.
     */
    disabled?: boolean;
};

/**
 * M3 split button with a menu (Figma 1252-37231): leading label segment +
 * trailing caret; the whole control opens the menu. While the menu is open the
 * button switches to the elevated state (Figma 1280-73042). Used for the lower
 * function bar of the legal editors (language / topic / version).
 */
export const SplitDropdown = ({
    icon,
    label,
    menu,
    title,
    tooltip,
    className,
    disabled = false,
}: SplitDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<'topRight' | 'bottomRight'>('bottomRight');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // A legal history row may have two text lines. Choose the side before
            // AntD measures the popup so it never slides over its own trigger.
            const estimatedHeight = Math.min(window.innerHeight * 0.6, 440, (menu.items?.length ?? 1) * 72 + 16);
            const spaceBelow = window.innerHeight - rect.bottom;
            setPlacement(spaceBelow < estimatedHeight && rect.top > spaceBelow ? 'topRight' : 'bottomRight');
        }
        setOpen(nextOpen);
    };
    return (
        <Dropdown
            trigger={['click']}
            placement={placement}
            autoAdjustOverflow
            overlayClassName={styles.splitDropdownOverlay}
            menu={menu}
            onOpenChange={handleOpenChange}
            disabled={disabled}
        >
            <button
                ref={triggerRef}
                type="button"
                className={`${styles.versionSplit} ${open && !disabled ? styles.splitOpen : ''} ${className ?? ''}`}
                title={tooltip ?? title}
                disabled={disabled}
                aria-label={typeof title === 'string' ? title : undefined}
                aria-expanded={open && !disabled}
                aria-haspopup="menu"
            >
                <span className={styles.versionLeading}>
                    <span aria-hidden="true">{icon}</span>
                    <span>{label}</span>
                </span>
                <span className={styles.versionTrailing}>
                    <ArrowDropDown />
                </span>
            </button>
        </Dropdown>
    );
};

export default SplitDropdown;
