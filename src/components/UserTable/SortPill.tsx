import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import menuStyles from './menu.module.scss';
import styles from './sortPill.module.scss';

export type NameSortField = 'lastname' | 'firstname' | 'email';

const FIELDS: { key: NameSortField; fallback: string }[] = [
    { key: 'lastname', fallback: 'Nachname' },
    { key: 'firstname', fallback: 'Vorname' },
    { key: 'email', fallback: 'E-Mail' },
];

export interface SortPillProps {
    value: NameSortField;
    onChange: (value: NameSortField) => void;
    /** Narrow tables: "Name nach" is left to screen readers. */
    compact?: boolean;
}

/** Chooses what the name column sorts by: Nachname, Vorname or E-Mail. */
export const SortPill = ({ value, onChange, compact = false }: SortPillProps) => {
    const { t } = useTranslation();
    const menuId = useId();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const label = (key: NameSortField) =>
        t(`userTable.sortPill.${key}`, FIELDS.find((field) => field.key === key)?.fallback ?? key);

    return (
        <>
            <button
                type="button"
                className={styles.pill}
                aria-haspopup="menu"
                aria-expanded={anchor != null}
                aria-controls={anchor ? menuId : undefined}
                onClick={(event) => setAnchor(event.currentTarget)}
            >
                <span className={compact ? styles.srOnly : styles.prefix}>
                    {t('userTable.sortPill.prefix', 'Name nach')}
                </span>
                <strong className={styles.value}>{label(value)}</strong>
                <ExpandMoreIcon className={styles.chevron} aria-hidden />
            </button>
            <Menu
                id={menuId}
                anchorEl={anchor}
                open={anchor != null}
                onClose={() => setAnchor(null)}
                slotProps={{
                    paper: { className: menuStyles.paper },
                    list: { 'aria-label': t('userTable.sortPill.menuLabel', 'Name sortieren nach') },
                }}
            >
                {FIELDS.map(({ key }) => (
                    <MenuItem
                        key={key}
                        role="menuitemradio"
                        aria-checked={key === value}
                        selected={key === value}
                        className={menuStyles.item}
                        onClick={() => {
                            setAnchor(null);
                            onChange(key);
                        }}
                    >
                        <span className={menuStyles.icon} aria-hidden>
                            {key === value && <CheckIcon className={menuStyles.check} />}
                        </span>
                        {label(key)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
