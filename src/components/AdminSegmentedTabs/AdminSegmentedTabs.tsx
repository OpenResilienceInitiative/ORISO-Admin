import { KeyboardEvent, ReactNode, useLayoutEffect, useRef } from 'react';
import classNames from 'classnames';
import { NavLink, useMatch, useResolvedPath } from 'react-router-dom';
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

const TAB_SELECTOR = '[role="tab"]:not([aria-disabled="true"])';

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
    onChange,
}: {
    item: AdminSegmentedTabItem;
    to: string;
    activeId?: string;
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
            className={getItemClassName(isActive)}
            onClick={() => onChange?.(item.id)}
        >
            <TabContent item={item} isActive={isActive} />
        </NavLink>
    );
};

/**
 * The one sub-navigation bar of the admin (Settings, Logs, Statistics, Invites,
 * Users, entity edit pages): M3 primary underline tabs on a full-width divider
 * (ORISO-Admin#1374). Icons are monochrome (`currentColor`), the active tab is
 * primary text with a 3px primary underline.
 *
 * Overflow: the row never wraps and never truncates a label — when the tabs do
 * not fit, the bar scrolls horizontally inside itself (the page never scrolls
 * sideways) and keeps the active tab in view.
 *
 * Keyboard: every tab is reachable with Tab; ←/→ move focus between tabs,
 * Home/End jump to the first/last, Enter/Space activate.
 */
export const AdminSegmentedTabs = ({ activeId, ariaLabel, className, items, onChange }: AdminSegmentedTabsProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep the active tab visible when the bar overflows. Only the bar scrolls —
    // `scrollIntoView` would also move the page.
    useLayoutEffect(() => {
        const scroller = scrollRef.current;
        const active = scroller?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
        if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) {
            return;
        }
        const tabRect = active.getBoundingClientRect();
        const start = tabRect.left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
        const end = start + tabRect.width;
        if (start < scroller.scrollLeft) {
            scroller.scrollLeft = start;
        } else if (end > scroller.scrollLeft + scroller.clientWidth) {
            scroller.scrollLeft = end - scroller.clientWidth;
        }
    });

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const tabs = Array.from(scrollRef.current?.querySelectorAll<HTMLElement>(TAB_SELECTOR) ?? []);
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

    return (
        <div className={classNames(styles.container, className)} data-admin-subnav>
            {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- focus lives on the tabs; the list only routes arrow keys */}
            <div
                ref={scrollRef}
                className={styles.scroll}
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

                    return <TabLink key={item.id} item={item} to={item.to} activeId={activeId} onChange={onChange} />;
                })}
            </div>
        </div>
    );
};

export default AdminSegmentedTabs;
