import type { ReactNode } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import styles from './m3NavigationBar.module.scss';

export interface M3NavigationBarItem {
    /** Stable key for the list item and for `onSelect`. */
    key: string;
    /** Visible + accessible label. */
    label: string;
    /** 24px glyph shown while the item is not selected. */
    icon: ReactNode;
    /**
     * Filled 24px glyph shown while the item is selected. M3 pairs the active
     * indicator with the filled icon variant; falls back to `icon` when the
     * icon set has no filled twin.
     */
    activeIcon?: ReactNode;
    /** Route to navigate to. Without it the item renders as a plain button. */
    to?: string;
}

export interface M3NavigationBarProps {
    /** Accessible name of the navigation landmark. */
    ariaLabel: string;
    /**
     * Destinations to render. M3 caps a navigation bar at 3–5 destinations —
     * anything beyond that belongs behind `more`. The component does not slice
     * the list itself; the caller decides what fits (see `useNavOverflow`).
     */
    items: M3NavigationBarItem[];
    /** Key of the selected destination. */
    activeKey?: string;
    /** Fired with the item key on activation (also for `to` items). */
    onSelect?: (key: string) => void;
    /** Trailing overflow slot ("Mehr"). Rendered as the last segment. */
    more?: {
        label: string;
        icon: ReactNode;
        onClick: () => void;
        /** Reflected as `aria-expanded` — set while the overflow sheet is open. */
        expanded?: boolean;
    };
    /**
     * Collapses the bar down to the `more` segment alone, rendered as a bare
     * 48×48 icon button. Used while the search occupies the row: the search may
     * take every pixel it wants, but this one button always survives, so the
     * user can open the full destination list without closing the search first.
     */
    collapsed?: boolean;
    /** BCP-47 language tag applied to the labels. */
    lang?: string;
    className?: string;
}

const ItemContent = ({ item, isActive, lang }: { item: M3NavigationBarItem; isActive: boolean; lang?: string }) => (
    <>
        <span className={classNames(styles.indicator, { [styles.indicatorActive]: isActive })}>
            <span className={styles.glyph} aria-hidden>
                {isActive ? item.activeIcon ?? item.icon : item.icon}
            </span>
        </span>
        <span className={classNames(styles.label, { [styles.labelActive]: isActive })} lang={lang}>
            {item.label}
        </span>
    </>
);

/**
 * Material-3 navigation bar with vertical (icon-over-label) items, per Figma
 * 56576:34607. Presentational only: it holds no permission, routing or
 * overflow logic, so it renders deterministically in Storybook — the same split
 * as {@link AdminSidebar} (#283). The caller resolves which destinations a user
 * may see and how many of them fit.
 *
 * The selected item gets the M3 active indicator: a 56×32 pill in the deep
 * brand red (`--admin-nav-indicator-surface`) behind the filled icon.
 */
export const M3NavigationBar = ({
    activeKey,
    ariaLabel,
    className,
    collapsed = false,
    items,
    lang,
    more,
    onSelect,
}: M3NavigationBarProps) => {
    const overflowButton = more && (
        <button
            type="button"
            className={classNames(styles.item, { [styles.itemIconOnly]: collapsed })}
            aria-haspopup="menu"
            aria-expanded={more.expanded ?? false}
            aria-label={collapsed ? more.label : undefined}
            onClick={more.onClick}
        >
            {collapsed ? (
                <span className={styles.glyph} aria-hidden>
                    {more.icon}
                </span>
            ) : (
                <ItemContent item={{ key: 'more', label: more.label, icon: more.icon }} isActive={false} lang={lang} />
            )}
        </button>
    );

    if (collapsed) {
        return (
            <nav className={classNames(styles.bar, styles.barCollapsed, className)} aria-label={ariaLabel}>
                {overflowButton}
            </nav>
        );
    }

    return (
        <nav className={classNames(styles.bar, className)} aria-label={ariaLabel}>
            {items.map((item) => {
                const isActive = item.key === activeKey;

                if (item.to) {
                    return (
                        // `Link`, not `NavLink`: NavLink overwrites any
                        // `aria-current` it is given with the result of its own
                        // route match, which would silently drop the marking on
                        // every destination whose active state is decided some
                        // other way (the sidebar's `activeMatch` routes, or a
                        // caller that pins the current section). `activeKey` is
                        // this component's single source of truth.
                        <Link
                            key={item.key}
                            to={item.to}
                            className={styles.item}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => onSelect?.(item.key)}
                        >
                            <ItemContent item={item} isActive={isActive} lang={lang} />
                        </Link>
                    );
                }

                return (
                    <button
                        key={item.key}
                        type="button"
                        className={styles.item}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => onSelect?.(item.key)}
                    >
                        <ItemContent item={item} isActive={isActive} lang={lang} />
                    </button>
                );
            })}

            {overflowButton}
        </nav>
    );
};

export default M3NavigationBar;
