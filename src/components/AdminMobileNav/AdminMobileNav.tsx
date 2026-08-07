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
    /** Search for the current section. */
    onSearch?: () => void;
    searchLabel?: string;
    /** Primary create action of the current section, e.g. "Träger anlegen". */
    onAdd?: () => void;
    addLabel?: string;
    /**
     * Filter controls of the current page, rendered in the search row between
     * search and add (Figma 1683:41718, "Searchbar Config Row").
     */
    filters?: ReactNode;
    openLabel: string;
    closeLabel: string;
    className?: string;
}

/**
 * The mobile navigation as a whole (Figma 1683:39455): the search row on top,
 * the bar row underneath it, and the destination menu that opens above both.
 *
 * It is the mobile sidebar, not a decoration of one: picking a destination in
 * the menu makes it the active section, its icon moves into the FAB when the
 * menu closes, and the chip row beside the FAB reloads with that section's
 * subsections.
 *
 * **The rows never trade places.** Search is always the row above the bar, even
 * on sections that have no subsections and no filters — a row that appears and
 * disappears would shift the menu's anchor every time you open it (Frank,
 * 2026-08-07). Sections without subsections simply show an empty chip row.
 */
export const AdminMobileNav = ({
    accountItems,
    activeSectionKey,
    activeSubsectionKey,
    addLabel,
    backLabel,
    className,
    closeLabel,
    filters,
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
            <div className={styles.searchRow} data-admin-mobile-nav-search-row>
                {onSearch && (
                    <button className={styles.search} type="button" aria-label={searchLabel} onClick={onSearch}>
                        <SearchIcon />
                    </button>
                )}
                {filters}
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
                    className={styles.fabMenu}
                />
                {onBack && (
                    <button className={styles.back} type="button" aria-label={backLabel} onClick={onBack}>
                        <ArrowBackIcon />
                    </button>
                )}
                {subsections.length > 0 && (
                    <M3ConnectedButtonGroup
                        ariaLabel={activeSection?.label ?? ''}
                        items={subsections}
                        selectedKey={activeSubsectionKey}
                        onSelect={onSubsectionSelect}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminMobileNav;
