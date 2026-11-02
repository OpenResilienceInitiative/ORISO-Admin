import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SearchIcon from '@mui/icons-material/Search';
import classNames from 'classnames';
import { searchNav, type NavSearchEntry } from './navSearch';
import { useRememberedExpansion } from './useRememberedExpansion';
import styles from './adminMobileNav.module.scss';

export interface AdminMobileNavSubsection {
    key: string;
    label: string;
    to?: string;
}

export interface AdminMobileNavItem {
    key: string;
    label: string;
    /** Shorter name for the bottom tab, like Slack's "DMs"; falls back to `label`. */
    tabLabel?: string;
    /** One line under the label in the menu, like Slack's "Browse your canvases…". */
    description?: string;
    icon?: ReactNode;
    to?: string;
}

export interface AdminMobileNavSection extends AdminMobileNavItem {
    /** Subsections of this section; with two or more it becomes a collapsible category. */
    subsections?: AdminMobileNavSubsection[];
}

export interface AdminMobileNavLabels {
    /** Name of the bar landmark. */
    navigation: string;
    /** The "More" tab that opens the menu card. */
    more: string;
    /** The round search button and the search dialog. */
    globalSearch: string;
    globalSearchPlaceholder: string;
    /** Shown in the search sheet before anything is typed. */
    globalSearchHint: string;
    /** Shown when nothing matches; `{{query}}` is not interpolated here, the caller does it. */
    globalSearchEmpty: string;
    close: string;
    back: string;
}

export interface AdminMobileNavProps {
    /** The sidebar's destinations, with the subsections each one has for this admin. */
    sections: AdminMobileNavSection[];
    /** Account-level entries, below the divider in the menu (profile, logout). */
    accountItems?: AdminMobileNavItem[];
    activeSectionKey: string;
    /** Route of the subsection you are on, matched against the subsections' `to`. */
    activeSubsectionKey?: string;
    /** Called for entries without a route, e.g. logout. */
    onSectionSelect?: (key: string) => void;
    /** Everything the global search may find (see `buildNavSearchEntries`). */
    searchEntries?: NavSearchEntry[];
    /** Present only on pages you can go back from. */
    onBack?: () => void;
    /** Search of the current page's list — distinct from the global search. */
    onSearch?: (term: string) => void;
    searchLabel?: string;
    searchPlaceholder?: string;
    /** Create action of the current page. */
    onAdd?: () => void;
    addLabel?: string;
    /** Filter controls of the current page, between page search and add. */
    filters?: ReactNode;
    labels: AdminMobileNavLabels;
    /** How many sections get their own tab before "More" (Slack shows three). */
    tabCount?: number;
    /**
     * Sections that get a tab first, in this order; missing ones are skipped
     * and the rest fills up in sidebar order (ORISO-Admin#1323).
     */
    tabKeys?: string[];
    className?: string;
}

type Sheet = 'menu' | 'search' | null;

/**
 * The mobile navigation (ORISO-Admin#1319), modelled on the Slack iOS app:
 *
 * - a floating tab bar at the bottom with the first sections and **More**,
 *   and a separate round **search** button on its right;
 * - **More** opens a compact menu card — never a full page — with one row per
 *   section (icon tile, title, one-line description); sections that have
 *   subsections are collapsible categories, and the last one the user expanded
 *   is remembered;
 * - **search** opens a global, typo-tolerant, German + English search over
 *   every destination this admin may open.
 *
 * The page's own toolbar (back, list search, filters, create) stays in the row
 * above the bar: it belongs to the page, not to the navigation.
 */
export const AdminMobileNav = ({
    accountItems = [],
    activeSectionKey,
    activeSubsectionKey,
    addLabel,
    className,
    filters,
    labels,
    onAdd,
    onBack,
    onSearch,
    onSectionSelect,
    searchEntries = [],
    searchLabel,
    searchPlaceholder,
    sections,
    tabCount = 3,
    tabKeys = [],
}: AdminMobileNavProps) => {
    const navigate = useNavigate();
    const [sheet, setSheet] = useState<Sheet>(null);
    const [pageSearchOpen, setPageSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const pageSearchRef = useRef<HTMLInputElement>(null);
    const globalSearchRef = useRef<HTMLInputElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const sheetId = useId();
    const { expandedKey, toggle } = useRememberedExpansion(activeSectionKey);

    const preferred = tabKeys.flatMap((key) => sections.filter((section) => section.key === key));
    const tabs = [...preferred, ...sections.filter((section) => !preferred.includes(section))].slice(0, tabCount);
    const moreIsActive = !tabs.some((tab) => tab.key === activeSectionKey);
    const results = useMemo(() => searchNav(searchEntries, query), [searchEntries, query]);

    // A route change (from a menu row, a result, a link in the page or the
    // back button) closes whatever is open; the page search belongs to the page
    // you left.
    useEffect(() => {
        setSheet(null);
        setPageSearchOpen(false);
    }, [activeSectionKey, activeSubsectionKey]);

    useEffect(() => {
        if (sheet === 'search') {
            globalSearchRef.current?.focus();
        } else if (sheet === 'menu') {
            sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus();
        } else {
            setQuery('');
            // Back to the button that opened the sheet, so keyboard and
            // screen-reader users keep their place in the bar.
            returnFocusRef.current?.focus();
            returnFocusRef.current = null;
        }
    }, [sheet]);

    useEffect(() => {
        if (pageSearchOpen) {
            pageSearchRef.current?.focus();
        }
    }, [pageSearchOpen]);

    useEffect(() => {
        if (!sheet) {
            return undefined;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSheet(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [sheet]);

    const close = () => setSheet(null);
    const toggleSheet = (next: Exclude<Sheet, null>) => {
        // Keep the first opener when switching from one sheet to the other.
        if (sheet === null) {
            returnFocusRef.current = document.activeElement as HTMLElement | null;
        }
        setSheet((current) => (current === next ? null : next));
    };

    const renderLeaf = (item: AdminMobileNavItem, active: boolean) => {
        const content = (
            <>
                <span className={styles.tile} aria-hidden>
                    {item.icon}
                </span>
                <span className={styles.text}>
                    <span className={styles.title}>{item.label}</span>
                    {item.description && <span className={styles.description}>{item.description}</span>}
                </span>
            </>
        );

        return item.to ? (
            <Link
                className={classNames(styles.menuRow, { [styles.menuRowActive]: active })}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                onClick={close}
            >
                {content}
            </Link>
        ) : (
            <button
                className={styles.menuRow}
                type="button"
                onClick={() => {
                    close();
                    onSectionSelect?.(item.key);
                }}
            >
                {content}
            </button>
        );
    };

    const renderSection = (section: AdminMobileNavSection) => {
        const active = section.key === activeSectionKey;
        const subsections = section.subsections ?? [];

        if (subsections.length < 2) {
            return <li key={section.key}>{renderLeaf(section, active)}</li>;
        }

        const expanded = expandedKey === section.key;
        const groupId = `${sheetId}-${section.key}`;

        return (
            <li key={section.key}>
                <button
                    className={classNames(styles.menuRow, { [styles.menuRowActive]: active })}
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={groupId}
                    onClick={() => toggle(section.key)}
                >
                    <span className={styles.tile} aria-hidden>
                        {section.icon}
                    </span>
                    <span className={styles.text}>
                        <span className={styles.title}>{section.label}</span>
                        {section.description && <span className={styles.description}>{section.description}</span>}
                    </span>
                    <ExpandMoreIcon
                        className={classNames(styles.chevron, { [styles.chevronOpen]: expanded })}
                        aria-hidden
                    />
                </button>
                {expanded && (
                    <ul className={styles.subList} id={groupId}>
                        {subsections.map((subsection) => {
                            const current = active && subsection.to === activeSubsectionKey;

                            return (
                                <li key={subsection.key}>
                                    <Link
                                        className={classNames(styles.subRow, { [styles.subRowActive]: current })}
                                        to={subsection.to ?? section.to ?? '#'}
                                        aria-current={current ? 'page' : undefined}
                                        onClick={close}
                                    >
                                        {subsection.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <div className={classNames(styles.root, className)} data-admin-mobile-nav>
            {sheet && <div className={styles.scrim} onClick={close} aria-hidden data-admin-mobile-nav-scrim />}

            {sheet === 'menu' && (
                <div
                    className={styles.sheet}
                    ref={sheetRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={labels.more}
                    data-admin-mobile-nav-menu
                >
                    <ul className={styles.menuList}>{sections.map(renderSection)}</ul>
                    {accountItems.length > 0 && (
                        <>
                            <hr className={styles.divider} />
                            <ul className={styles.menuList}>
                                {accountItems.map((item) => (
                                    <li key={item.key}>{renderLeaf(item, item.key === activeSectionKey)}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}

            {sheet === 'search' && (
                <div
                    className={classNames(styles.sheet, styles.searchSheet)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={labels.globalSearch}
                    data-admin-mobile-nav-global-search
                >
                    {query.trim() === '' && <p className={styles.hint}>{labels.globalSearchHint}</p>}
                    {query.trim() !== '' && results.length === 0 && (
                        <p className={styles.hint} role="status">
                            {labels.globalSearchEmpty}
                        </p>
                    )}
                    {results.length > 0 && (
                        <ul className={styles.menuList} aria-label={labels.globalSearch}>
                            {results.map(({ entry }) => (
                                <li key={entry.id}>
                                    <Link className={styles.resultRow} to={entry.to} onClick={close}>
                                        <span className={styles.title}>{entry.label}</span>
                                        {entry.sectionLabel && (
                                            <span className={styles.description}>{entry.sectionLabel}</span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className={styles.globalSearchField}>
                        <SearchIcon className={styles.searchFieldIcon} aria-hidden />
                        <input
                            className={styles.searchInput}
                            ref={globalSearchRef}
                            type="search"
                            aria-label={labels.globalSearch}
                            placeholder={labels.globalSearchPlaceholder}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                // Enter opens the best hit, like Slack's quick switcher.
                                if (event.key === 'Enter' && results[0]) {
                                    event.preventDefault();
                                    close();
                                    navigate(results[0].entry.to);
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {(onBack || onSearch || onAdd || filters) && (
                <div className={styles.searchRow} data-admin-mobile-nav-search-row>
                    {onBack && (
                        <button className={styles.back} type="button" aria-label={labels.back} onClick={onBack}>
                            <ArrowBackIcon />
                        </button>
                    )}
                    {onSearch &&
                        (pageSearchOpen ? (
                            <div className={styles.searchField} data-admin-mobile-nav-search-open>
                                <SearchIcon className={styles.searchFieldIcon} />
                                <input
                                    className={styles.searchInput}
                                    ref={pageSearchRef}
                                    type="search"
                                    aria-label={searchLabel}
                                    placeholder={searchPlaceholder}
                                    onChange={(event) => onSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') {
                                            setPageSearchOpen(false);
                                        }
                                    }}
                                />
                                <button
                                    className={styles.searchClose}
                                    type="button"
                                    aria-label={labels.close}
                                    onClick={() => {
                                        onSearch('');
                                        setPageSearchOpen(false);
                                    }}
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        ) : (
                            <button
                                className={styles.pageSearch}
                                type="button"
                                aria-label={searchLabel}
                                aria-expanded={false}
                                onClick={() => setPageSearchOpen(true)}
                            >
                                <SearchIcon />
                            </button>
                        ))}
                    {!pageSearchOpen && filters}
                    {onAdd && (
                        <button
                            className={classNames(styles.add, { [styles.addCompact]: pageSearchOpen })}
                            type="button"
                            aria-label={addLabel}
                            onClick={onAdd}
                        >
                            <AddIcon />
                            {!pageSearchOpen && addLabel && <span className={styles.addLabel}>{addLabel}</span>}
                        </button>
                    )}
                </div>
            )}

            <div className={styles.bar}>
                <nav className={styles.tabBar} aria-label={labels.navigation}>
                    {tabs.map((tab) => {
                        const active = sheet === null && tab.key === activeSectionKey;

                        return (
                            <Link
                                key={tab.key}
                                className={classNames(styles.tab, { [styles.tabActive]: active })}
                                to={tab.to ?? '#'}
                                aria-current={active ? 'page' : undefined}
                                onClick={close}
                            >
                                <span className={styles.tabIcon} aria-hidden>
                                    {tab.icon}
                                </span>
                                <span className={styles.tabLabel}>{tab.tabLabel ?? tab.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        className={classNames(styles.tab, {
                            [styles.tabActive]: sheet === 'menu' || (sheet === null && moreIsActive),
                        })}
                        type="button"
                        aria-expanded={sheet === 'menu'}
                        aria-haspopup="dialog"
                        onClick={() => toggleSheet('menu')}
                        data-admin-mobile-nav-more
                    >
                        <span className={styles.tabIcon} aria-hidden>
                            <MoreHorizIcon />
                        </span>
                        <span className={styles.tabLabel}>{labels.more}</span>
                    </button>
                </nav>
                <button
                    className={classNames(styles.searchButton, { [styles.searchButtonActive]: sheet === 'search' })}
                    type="button"
                    aria-label={sheet === 'search' ? labels.close : labels.globalSearch}
                    aria-expanded={sheet === 'search'}
                    aria-haspopup="dialog"
                    onClick={() => toggleSheet('search')}
                    data-admin-mobile-nav-search
                >
                    {sheet === 'search' ? <CloseIcon /> : <SearchIcon />}
                </button>
            </div>
        </div>
    );
};

export default AdminMobileNav;
