import { useId, useState, type ReactNode } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import classNames from 'classnames';
import { IconButton } from '../IconButton';
import styles from './menu.module.scss';

export interface RowMenuItem {
    key: string;
    label: string;
    icon?: ReactNode;
    onSelect: () => void;
    /** `error` = destructive (magenta error role). */
    tone?: 'error';
    /** Stays visible in the menu, greyed out. */
    disabled?: boolean;
}

export interface RowMenuProps {
    items: RowMenuItem[];
    /** Names the row, e.g. "Weitere Aktionen für Maria Huber". */
    ariaLabel: string;
}

/** ⋯ button with the row's actions, for widths where the icon buttons do not fit. */
export const RowMenu = ({ items, ariaLabel }: RowMenuProps) => {
    const menuId = useId();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const close = () => setAnchor(null);

    return (
        <>
            <IconButton
                icon={<MoreVertIcon />}
                ariaLabel={ariaLabel}
                ariaHasPopup="menu"
                ariaExpanded={anchor != null}
                ariaControls={anchor ? menuId : undefined}
                onClick={(event) => setAnchor(event.currentTarget)}
            />
            <Menu
                id={menuId}
                anchorEl={anchor}
                open={anchor != null}
                onClose={close}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { className: styles.paper }, list: { 'aria-label': ariaLabel } }}
            >
                {items.map((item) => (
                    <MenuItem
                        key={item.key}
                        disabled={item.disabled}
                        className={classNames(styles.item, { [styles.error]: item.tone === 'error' })}
                        onClick={() => {
                            close();
                            item.onSelect();
                        }}
                    >
                        {item.icon && (
                            <span className={styles.icon} aria-hidden>
                                {item.icon}
                            </span>
                        )}
                        {item.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
