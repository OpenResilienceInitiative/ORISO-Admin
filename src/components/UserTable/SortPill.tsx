import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import menuStyles from './menu.module.scss';
import styles from './sortPill.module.scss';

export type NameSortField = 'lastname' | 'firstname' | 'email';
export type SortPillValue = NameSortField | 'lastUpdated';

const FIELDS: { key: SortPillValue; fallback: string }[] = [
    { key: 'lastname', fallback: 'Nachname' },
    { key: 'firstname', fallback: 'Vorname' },
    { key: 'email', fallback: 'E-Mail' },
];
const DATE_FIELD = { key: 'lastUpdated' as const, fallback: 'Zuletzt aktualisiert' };

export interface SortPillProps<T extends SortPillValue = NameSortField> {
    value: T;
    onChange: (value: T) => void;
    /** Narrow tables: "Name nach" is left to screen readers. */
    compact?: boolean;
    /** Adds "Zuletzt aktualisiert" where the date column is hidden. */
    withDate?: boolean;
}

/** Chooses what the name column sorts by: Nachname, Vorname or E-Mail (optionally the date). */
export const SortPill = <T extends SortPillValue = NameSortField>({
    value,
    onChange,
    compact = false,
    withDate = false,
}: SortPillProps<T>) => {
    const { t } = useTranslation();
    const menuId = useId();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const fields = withDate ? [...FIELDS, DATE_FIELD] : FIELDS;
    const label = (key: SortPillValue) =>
        t(`userTable.sortPill.${key}`, fields.find((field) => field.key === key)?.fallback ?? key);
    const byDate = value === 'lastUpdated';

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
                    {byDate
                        ? t('userTable.sortPill.prefixAny', 'Sortiert nach')
                        : t('userTable.sortPill.prefix', 'Name nach')}
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
                    list: {
                        'aria-label': withDate
                            ? t('userTable.sortPill.menuLabelAny', 'Sortieren nach')
                            : t('userTable.sortPill.menuLabel', 'Name sortieren nach'),
                    },
                }}
            >
                {fields.map(({ key }) => (
                    <MenuItem
                        key={key}
                        role="menuitemradio"
                        aria-checked={key === value}
                        selected={key === value}
                        className={menuStyles.item}
                        onClick={() => {
                            setAnchor(null);
                            onChange(key as T);
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
