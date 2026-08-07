import { useEffect, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import classNames from 'classnames';
import { M3ConnectedButtonGroup, type M3ConnectedButtonGroupItem } from '../M3ConnectedButtonGroup';
import { M3FabMenu, type M3FabMenuItem } from '../M3FabMenu';
import styles from './adminMobileNav.module.scss';

export interface AdminMobileNavSection extends M3FabMenuItem {
    /** Subsections of this section; empty when the section is a plain page. */
    subsections?: M3ConnectedButtonGroupItem[];
}

export interface AdminMobileNavProps {
    /** The sidebar's destinations — this bar *is* the mobile sidebar. */
    sections: AdminMobileNavSection[];
    /** Account-level entries, rendered below the destinations in the menu. */
    accountItems?: M3FabMenuItem[];
    activeSectionKey: string;
    activeSubsectionKey?: string;
    onSectionSelect?: (key: string) => void;
    onSubsectionSelect?: (key: string) => void;
    /** Present only on pages you can go back from; icon only, never a label. */
    onBack?: () => void;
    backLabel?: string;
    /** Search for the current section. Shown when it has no subsections. */
    onSearch?: () => void;
    searchLabel?: string;
    /** Primary create action of the current section, e.g. "Träger anlegen". */
    onAdd?: () => void;
    addLabel?: string;
    openLabel: string;
    closeLabel: string;
    /** Extra row above the bar — the expanded search or a filter row. */
    aboveRow?: ReactNode;
    className?: string;
}

/**
 * The mobile navigation as a whole (Figma 1683:39455, all six variants): the
 * page FAB with the destination menu, an optional back button, and the
 * subsections of the section you are in.
 *
 * It is the mobile sidebar, not a decoration of one: picking a destination in
 * the menu makes it the active section, its icon moves into the FAB when the
 * menu closes, and the row next to the FAB reloads with that section's
 * subsections. Sections without subsections show their search and create
 * actions there instead, so the row is never empty and never dead.
 */
export const AdminMobileNav = ({
    accountItems,
    activeSectionKey,
    activeSubsectionKey,
    addLabel,
    aboveRow,
    backLabel,
    className,
    closeLabel,
    onAdd,
    onBack,
    onSearch,
    onSectionSelect,
    onSubsectionSelect,
    openLabel,
    searchLabel,
    sections,
}: AdminMobileNavProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const activeSection = sections.find((section) => section.key === activeSectionKey);
    const subsections = activeSection?.subsections ?? [];

    // Changing section while the menu is open is the normal path — the menu
    // closes itself on selection, but a section change from elsewhere (a link
    // in the page, the back button) must not leave it hanging open.
    useEffect(() => {
        setMenuOpen(false);
    }, [activeSectionKey]);

    return (
        <div className={classNames(styles.root, className)} data-admin-mobile-nav>
            {aboveRow && <div className={styles.aboveRow}>{aboveRow}</div>}
            <div className={styles.row}>
                <M3FabMenu
                    items={sections}
                    footerItems={accountItems}
                    activeKey={activeSectionKey}
                    open={menuOpen}
                    onOpenChange={setMenuOpen}
                    openLabel={openLabel}
                    closeLabel={closeLabel}
                    onSelect={onSectionSelect}
                />
                {onBack && (
                    <button className={styles.back} type="button" aria-label={backLabel} onClick={onBack}>
                        <ArrowBackIcon />
                    </button>
                )}
                {subsections.length > 0 ? (
                    <M3ConnectedButtonGroup
                        ariaLabel={activeSection?.label ?? ''}
                        items={subsections}
                        selectedKey={activeSubsectionKey}
                        onSelect={onSubsectionSelect}
                    />
                ) : (
                    <div className={styles.actions}>
                        {onSearch && (
                            <button className={styles.action} type="button" aria-label={searchLabel} onClick={onSearch}>
                                <SearchIcon />
                            </button>
                        )}
                        {onAdd && (
                            <button
                                className={classNames(styles.action, styles.actionPrimary)}
                                type="button"
                                aria-label={addLabel}
                                onClick={onAdd}
                            >
                                <AddIcon />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMobileNav;
