import { KeyboardEvent, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { NavLink, useInRouterContext, useLocation, useMatch, useResolvedPath } from 'react-router-dom';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import menuStyles from '../UserTable/menu.module.scss';
import styles from './AdminSegmentedTabs.module.scss';

export type AdminSegmentedTabItem = {
    id: string;
    label: string;
    icon?: ReactNode;
    activeIcon?: ReactNode;
    /** Status marker after the label (e.g. "legal data missing"); keeps its own colour. */
    badge?: ReactNode;
    to?: string;
    /** Forwarded to `NavLink` — exact-match only, for a `to` that is a prefix of its siblings. */
    end?: boolean;
    disabled?: boolean;
};

interface AdminSegmentedTabsProps {
    ariaLabel: string;
    items: AdminSegmentedTabItem[];
    activeId?: string;
    className?: string;
    onChange?: (id: string) => void;
}

const TAB_SELECTOR = '[role="tab"]:not([aria-disabled="true"]):not([hidden])';

interface FitTabsInput {
    /** Natural width of every tab, in item order. */
    widths: number[];
    /** Width of the whole bar. */
    available: number;
    /** Width of the „Mehr (n)“ button. */
    moreWidth: number;
    /** Gap between two tabs (and between the last tab and „Mehr“). */
    gap: number;
    /** Index of the selected tab, or -1. */
    activeIndex: number;
}

/**
 * Which tabs go behind „Mehr“: the indices of the tabs that do not fit.
 *
 * The bar keeps the leading tabs in their order and moves the tail into the
 * menu. The selected tab is never in the menu: if it would be, it takes the
 * place of the last tabs that still fit (order is kept, it stays at the end).
 * A bar that has not been laid out yet (`available` 0, e.g. jsdom or a hidden
 * panel) shows every tab.
 */
export const fitTabs = ({ widths, available, moreWidth, gap, activeIndex }: FitTabsInput): number[] => {
    if (available <= 0 || widths.length === 0) {
        return [];
    }
    const span = (indices: number[]) =>
        indices.reduce((sum, index) => sum + widths[index], 0) + gap * Math.max(indices.length - 1, 0);
    const all = widths.map((_, index) => index);
    // Half a pixel of slack: rendered widths are fractional.
    if (span(all) <= available + 0.5) {
        return [];
    }

    const budget = available - moreWidth - gap;
    const visible: number[] = [];
    for (let index = 0; index < all.length && span([...visible, index]) <= budget; index += 1) {
        visible.push(index);
    }
    if (activeIndex >= 0 && !visible.includes(activeIndex)) {
        while (visible.length > 0 && span([...visible, activeIndex]) > budget) {
            visible.pop();
        }
        visible.push(activeIndex);
    }

    return all.filter((index) => !visible.includes(index));
};

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

const TabContent = ({ item, isActive }: { item: AdminSegmentedTabItem; isActive: boolean }) => {
    const icon = isActive ? item.activeIcon || item.icon : item.icon;

    return (
        <>
            {icon && (
                <span className={styles.icon} aria-hidden>
                    {icon}
                </span>
            )}
            <span className={styles.label}>{item.label}</span>
            {item.badge && <span className={styles.badge}>{item.badge}</span>}
        </>
    );
};

const getItemClassName = (isActive: boolean, isDisabled?: boolean) =>
    classNames(styles.item, {
        [styles.itemActive]: isActive,
        [styles.itemDisabled]: isDisabled,
    });

/**
 * Route-driven tab. Matches the route itself (same rule as `NavLink`) so the
 * tab can expose `aria-selected`, which `NavLink` only offers as `aria-current`.
 */
const TabLink = ({
    item,
    to,
    activeId,
    hidden,
    onChange,
}: {
    item: AdminSegmentedTabItem;
    to: string;
    activeId?: string;
    hidden: boolean;
    onChange?: (id: string) => void;
}) => {
    const resolved = useResolvedPath(to);
    const match = useMatch({ path: resolved.pathname, end: Boolean(item.end) });
    const isActive = activeId ? item.id === activeId : Boolean(match);

    return (
        <NavLink
            to={to}
            end={item.end}
            role="tab"
            aria-selected={isActive}
            data-tab-id={item.id}
            hidden={hidden}
            className={getItemClassName(isActive)}
            onClick={() => onChange?.(item.id)}
        >
            <TabContent item={item} isActive={isActive} />
        </NavLink>
    );
};

/**
 * Reruns `onRouteChange` after every route change (browser Back/Forward too):
 * the link tabs re-render on their own, but the bar would not, so a newly
 * selected tab could stay behind „Mehr“. Only mounted inside a router.
 */
const OnRouteChange = ({ onRouteChange }: { onRouteChange: () => void }) => {
    const { key } = useLocation();
    useLayoutEffect(() => {
        onRouteChange();
    }, [key, onRouteChange]);
    return null;
};

/**
 * The one sub-navigation bar of the admin (Settings, Logs, Statistics, Invites,
 * Users, entity edit pages): M3 primary underline tabs on a full-width divider
 * (ORISO-Admin#1374). Icons are monochrome (`currentColor`), the active tab is
 * primary text with a 3px primary underline.
 *
 * Overflow: the row never wraps, never truncates a label and never scrolls.
 * Tabs that do not fit move into a trailing „Mehr (n)“ button that opens a
 * menu; the selected tab always stays in the bar. „Mehr“ sits next to the
 * tablist, not in it — it opens a menu, it is not a tab.
 *
 * Keyboard: every tab is reachable with Tab; ←/→ move focus between tabs,
 * Home/End jump to the first/last, Enter/Space activate. „Mehr“ opens with
 * Enter, Space or ↓; ↑/↓ move in the menu, Esc closes it and focus returns.
 *
 * On phones the bar is not rendered at all (`PageTabs`): the subsections live
 * in the mobile bottom navigation.
 */
export const AdminSegmentedTabs = ({ activeId, ariaLabel, className, items, onChange }: AdminSegmentedTabsProps) => {
    const { t } = useTranslation();
    const inRouter = useInRouterContext();
    const menuId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLButtonElement>(null);
    // Natural tab widths, kept while a tab is hidden behind „Mehr“.
    const widthsRef = useRef(new Map<string, number>());
    const moreWidthRef = useRef(0);
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    // A fresh menu per opening: MUI remembers the last focused entry while a
    // closing menu fades out, but a menu button always opens on its first entry.
    const [menuKey, setMenuKey] = useState(0);

    // Tabs, labels and icons decide the widths: when they change (new tabs, a
    // language switch, a late web font) one render shows every tab so it can
    // be measured, before the browser paints.
    const signature = items
        .map((item) => [item.id, item.label, item.icon ? 1 : 0, item.badge ? 1 : 0].join(':'))
        .join('|');
    const [measuredFor, setMeasuredFor] = useState<string | null>(null);
    // An open menu is never reshuffled under the user's focus: measuring and
    // re-splitting wait until it is closed.
    const measuring = measuredFor !== signature && menuAnchor === null;
    const menuOpenRef = useRef(false);

    const updateOverflow = useCallback(() => {
        const container = containerRef.current;
        const list = listRef.current;
        if (!container || !list || menuOpenRef.current) {
            return;
        }
        const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
        tabs.forEach((tab) => {
            if (!tab.hidden && tab.dataset.tabId) {
                widthsRef.current.set(tab.dataset.tabId, tab.getBoundingClientRect().width);
            }
        });
        if (moreRef.current) {
            // The widest label seen ("Mehr (7)" while measuring) keeps the split stable.
            moreWidthRef.current = Math.max(moreWidthRef.current, moreRef.current.getBoundingClientRect().width);
        }

        const ids = tabs.map((tab) => tab.dataset.tabId ?? '');
        const hidden = fitTabs({
            widths: ids.map((id) => widthsRef.current.get(id) ?? 0),
            available: container.getBoundingClientRect().width,
            moreWidth: moreWidthRef.current,
            gap: parseFloat(getComputedStyle(list).columnGap) || 0,
            activeIndex: tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
        }).map((index) => ids[index]);

        setHiddenIds((previous) => (sameIds(previous, hidden) ? previous : hidden));
    }, []);

    // After every render: the selected tab may have changed (activeId).
    useLayoutEffect(() => {
        menuOpenRef.current = menuAnchor !== null;
        if (measuring) {
            widthsRef.current.clear();
            moreWidthRef.current = 0;
            updateOverflow();
            setMeasuredFor(signature);
            return;
        }
        updateOverflow();
    });

    // The window (or the content column) was resized; a resize does not re-render.
    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(() => updateOverflow());
        observer.observe(container);
        return () => observer.disconnect();
    }, [updateOverflow]);

    // Widths measured with a fallback font are wrong once the web font arrives;
    // fonts load lazily, so this can happen any time after the first render.
    useEffect(() => {
        const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
        if (!fonts || typeof fonts.addEventListener !== 'function') {
            return undefined;
        }
        const remeasure = () => setMeasuredFor(null);
        fonts.addEventListener('loadingdone', remeasure);
        return () => fonts.removeEventListener('loadingdone', remeasure);
    }, []);

    const isHidden = (id: string) => !measuring && hiddenIds.includes(id);
    const overflow = measuring ? [] : items.filter((item) => hiddenIds.includes(item.id));
    const showMore = measuring || overflow.length > 0;
    const menuOpen = menuAnchor !== null && overflow.length > 0;
    const closeMenu = () => setMenuAnchor(null);
    const openMenu = (anchor: HTMLElement) => {
        setMenuKey((key) => key + 1);
        setMenuAnchor(anchor);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const tabs = Array.from(listRef.current?.querySelectorAll<HTMLElement>(TAB_SELECTOR) ?? []);
        const current = tabs.indexOf(event.target as HTMLElement);
        if (current === -1) {
            return;
        }

        let next: number | undefined;
        switch (event.key) {
            case 'ArrowRight':
                next = (current + 1) % tabs.length;
                break;
            case 'ArrowLeft':
                next = (current - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = tabs.length - 1;
                break;
            case ' ':
                // Links do not activate on Space by themselves; tabs must.
                if (tabs[current].tagName === 'A') {
                    event.preventDefault();
                    tabs[current].click();
                }
                return;
            default:
                return;
        }

        event.preventDefault();
        tabs[next].focus();
    };

    const handleMoreKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        // Enter and Space open it as a click; ↓ is the menu-button shortcut.
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(event.currentTarget);
        }
    };

    return (
        <div ref={containerRef} className={classNames(styles.container, className)} data-admin-subnav>
            {inRouter && <OnRouteChange onRouteChange={updateOverflow} />}
            {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- focus lives on the tabs; the list only routes arrow keys */}
            <div
                ref={listRef}
                className={styles.list}
                role="tablist"
                aria-label={ariaLabel}
                aria-orientation="horizontal"
                onKeyDown={handleKeyDown}
            >
                {items.map((item) => {
                    if (item.disabled || !item.to) {
                        const isActive = item.id === activeId;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-disabled={item.disabled || undefined}
                                data-tab-id={item.id}
                                hidden={isHidden(item.id)}
                                className={getItemClassName(isActive, item.disabled)}
                                disabled={item.disabled}
                                onClick={() => {
                                    if (!item.disabled) {
                                        onChange?.(item.id);
                                    }
                                }}
                            >
                                <TabContent item={item} isActive={isActive} />
                            </button>
                        );
                    }

                    return (
                        <TabLink
                            key={item.id}
                            item={item}
                            to={item.to}
                            activeId={activeId}
                            hidden={isHidden(item.id)}
                            onChange={onChange}
                        />
                    );
                })}
            </div>
            {showMore && (
                <button
                    ref={moreRef}
                    type="button"
                    className={classNames(styles.item, styles.more)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? menuId : undefined}
                    data-admin-subnav-more
                    onClick={(event) => openMenu(event.currentTarget)}
                    onKeyDown={handleMoreKeyDown}
                >
                    <span className={styles.label}>
                        {t('page.tabs.more', {
                            n: measuring ? items.length : overflow.length,
                            defaultValue: 'Mehr ({{n}})',
                        })}
                    </span>
                    <span className={classNames(styles.icon, styles.moreChevron)} aria-hidden>
                        <ExpandMoreIcon />
                    </span>
                </button>
            )}
            <Menu
                key={menuKey}
                id={menuId}
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: { className: menuStyles.paper },
                    list: { 'aria-label': t('page.tabs.moreMenu', { defaultValue: 'Weitere Unterbereiche' }) },
                }}
            >
                {overflow.map((item) => {
                    const content = (
                        <>
                            <span className={menuStyles.icon} aria-hidden>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                            {item.badge && <span className={styles.badge}>{item.badge}</span>}
                        </>
                    );
                    const select = () => {
                        closeMenu();
                        onChange?.(item.id);
                    };

                    if (item.to && !item.disabled) {
                        return (
                            <MenuItem
                                key={item.id}
                                component={NavLink}
                                to={item.to}
                                end={item.end}
                                className={menuStyles.item}
                                onClick={select}
                            >
                                {content}
                            </MenuItem>
                        );
                    }

                    return (
                        <MenuItem key={item.id} disabled={item.disabled} className={menuStyles.item} onClick={select}>
                            {content}
                        </MenuItem>
                    );
                })}
            </Menu>
        </div>
    );
};

export default AdminSegmentedTabs;
