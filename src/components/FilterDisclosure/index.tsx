import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import classNames from 'classnames';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface FilterDisclosureProps {
    /** How many filters are set; shown on the button so a closed panel never hides that the list is narrowed. */
    activeCount?: number;
    /** Name of the group of filters for screen readers, e.g. "Liste filtern". */
    groupLabel: string;
    /** Opens with the page (e.g. when a filter came in through the URL). */
    defaultOpen?: boolean;
    /** Sits in the same row as the button, before it (usually the list search). */
    leading?: ReactNode;
    /** Sits at the end of the button row (actions, pagination). */
    trailing?: ReactNode;
    /** The filters themselves; rendered only while the panel is open. */
    children: ReactNode;
    className?: string;
}

/**
 * One "Filter" button above a list instead of a row of always-visible dropdowns (Admin#1510). The
 * search stays visible next to it; the filters fold out below. The button shows how many filters
 * are active, and the page keeps showing the active filter itself (e.g. a context bar), so a closed
 * panel never hides why the list is shorter.
 */
export const FilterDisclosure = ({
    activeCount = 0,
    groupLabel,
    defaultOpen = false,
    leading,
    trailing,
    children,
    className,
}: FilterDisclosureProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(defaultOpen);
    const panelId = useId();

    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.row}>
                {leading && <div className={styles.leading}>{leading}</div>}
                <button
                    type="button"
                    aria-controls={panelId}
                    aria-expanded={open}
                    className={classNames(styles.toggle, { [styles.toggleActive]: activeCount > 0 })}
                    onClick={() => setOpen((current) => !current)}
                >
                    <TuneOutlinedIcon aria-hidden fontSize="small" />
                    {t('filterDisclosure.button', 'Filter')}
                    {activeCount > 0 && (
                        <span className={styles.count}>
                            <span aria-hidden>{activeCount}</span>
                            <span className={styles.visuallyHidden}>
                                {t('filterDisclosure.activeCount', '{{count}} aktiv', { count: activeCount })}
                            </span>
                        </span>
                    )}
                    <KeyboardArrowDownIcon
                        aria-hidden
                        fontSize="small"
                        className={classNames(styles.chevron, { [styles.chevronOpen]: open })}
                    />
                </button>
                {trailing && <div className={styles.trailing}>{trailing}</div>}
            </div>
            <div id={panelId} role="group" aria-label={groupLabel} className={styles.panel} hidden={!open}>
                {open && children}
            </div>
        </div>
    );
};
