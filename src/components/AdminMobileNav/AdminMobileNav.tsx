import { useEffect, useRef, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
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
    /**
     * Search for the current page. Leave it out on pages that have none — most
     * settings pages don't — and the control is not rendered at all.
     */
    onSearch?: (term: string) => void;
    searchLabel?: string;
    searchPlaceholder?: string;
    /** Create action of the current page. Not every page has one (logs don't). */
    onAdd?: () => void;
    addLabel?: string;
    /**
     * Filter controls of the current page, rendered between search and add
     * (Figma 1683:41718, "Searchbar Config Row").
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
 * **The rows never trade places.** The search row keeps its height even on a
 * page that has neither search, filters nor a create action — a row that
 * appears and disappears would shift the menu's anchor every time you open it
 * (Frank, 2026-08-07).
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
    searchPlaceholder,
    sections,
}: AdminMobileNavProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const activeSection = sections.find((section) => section.key === activeSectionKey);
    const subsections = activeSection?.subsections ?? [];

    // Changing section while the menu is open is the normal path — the menu
    // closes itself on selection, but a section change from elsewhere (a link
    // in the page, the back button) must not leave it hanging open. The search
    // belongs to the page you left, so it closes with it.
    useEffect(() => {
        setMenuOpen(false);
        setSearchOpen(false);
    }, [activeSectionKey]);

    useEffect(() => {
        if (searchOpen) {
            inputRef.current?.focus();
        }
    }, [searchOpen]);

    return (
        <div className={classNames(styles.root, className)} data-admin-mobile-nav>
            <div className={styles.searchRow} data-admin-mobile-nav-search-row>
                {onSearch &&
                    (searchOpen ? (
                        <div className={styles.searchField} data-admin-mobile-nav-search-open>
                            <SearchIcon className={styles.searchFieldIcon} />
                            <input
                                className={styles.searchInput}
                                ref={inputRef}
                                type="search"
                                aria-label={searchLabel}
                                placeholder={searchPlaceholder}
                                onChange={(event) => onSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        setSearchOpen(false);
                                    }
                                }}
                            />
                            <button
                                className={styles.searchClose}
                                type="button"
                                aria-label={closeLabel}
                                onClick={() => {
                                    onSearch('');
                                    setSearchOpen(false);
                                }}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    ) : (
                        <button
                            className={styles.search}
                            type="button"
                            aria-label={searchLabel}
                            aria-expanded={false}
                            onClick={() => setSearchOpen(true)}
                        >
                            <SearchIcon />
                        </button>
                    ))}
                {!searchOpen && filters}
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
