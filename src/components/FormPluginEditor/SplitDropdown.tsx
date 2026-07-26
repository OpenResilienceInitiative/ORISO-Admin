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
};

/**
 * M3 split button with a menu (Figma 1252-37231): leading label segment +
 * trailing caret; the whole control opens the menu. While the menu is open the
 * button switches to the elevated state (Figma 1280-73042). Used for the lower
 * function bar of the legal editors (language / topic / version).
 */
export const SplitDropdown = ({ icon, label, menu, title }: SplitDropdownProps) => {
    const [open, setOpen] = useState(false);
    return (
        <Dropdown trigger={['click']} menu={menu} onOpenChange={setOpen}>
            <button
                type="button"
                className={`${styles.versionSplit} ${open ? styles.splitOpen : ''}`}
                title={title}
                aria-label={typeof title === 'string' ? title : undefined}
                aria-expanded={open}
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
