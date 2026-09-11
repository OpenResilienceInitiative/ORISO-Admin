import { useState } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { ArrowDropDown } from '@mui/icons-material';
import styles from './M3RichTextEditor.module.scss';

export type SplitDropdownProps = {
    icon: React.ReactNode;
    label: React.ReactNode;
    menu: MenuProps;
    title?: string;
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
export const SplitDropdown = ({ icon, label, menu, title, disabled = false }: SplitDropdownProps) => {
    const [open, setOpen] = useState(false);
    return (
        <Dropdown trigger={['click']} menu={menu} onOpenChange={setOpen} disabled={disabled}>
            <button
                type="button"
                className={`${styles.versionSplit} ${open && !disabled ? styles.splitOpen : ''}`}
                title={title}
                disabled={disabled}
                aria-label={typeof title === 'string' ? title : undefined}
                aria-expanded={open && !disabled}
            >
                <span className={styles.versionLeading}>
                    {icon}
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
