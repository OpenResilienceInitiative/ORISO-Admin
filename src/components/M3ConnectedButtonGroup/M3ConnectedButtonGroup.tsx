import { useEffect, useRef, type ReactNode } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import styles from './m3ConnectedButtonGroup.module.scss';

export interface M3ConnectedButtonGroupItem {
    key: string;
    label: string;
    icon?: ReactNode;
    /** Route. Without it the segment renders as a plain button. */
    to?: string;
}

export interface M3ConnectedButtonGroupProps {
    /** Accessible name of the group, e.g. the section it belongs to. */
    ariaLabel: string;
    items: M3ConnectedButtonGroupItem[];
    selectedKey?: string;
    onSelect?: (key: string) => void;
    className?: string;
}

/**
 * M3 connected button group (Figma 1683:39456, `Active Subheaders`) — the
 * subsections of the section you are in, sitting next to the page FAB.
 *
 * Selection morphs the shape: an unselected segment is an 8px-cornered slab,
 * the selected one becomes a full pill. That morph, not just colour, is what
 * M3 uses to mark the selection, which is why this is not the same component
 * as our desktop `SegmentedTabs`.
 *
 * The group is wider than the space next to the FAB by design and scrolls
 * horizontally; the selected segment is scrolled into view whenever it changes.
 */
export const M3ConnectedButtonGroup = ({
    ariaLabel,
    className,
    items,
    onSelect,
    selectedKey,
}: M3ConnectedButtonGroupProps) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Switching sections can select a segment that sits off-screen — reaching a
    // subsection you cannot see would mean scrolling blind.
    useEffect(() => {
        // Optional call: jsdom has no scrollIntoView, and a missing scroll must
        // never take the navigation down with it.
        listRef.current
            ?.querySelector('[data-admin-chip-selected="true"]')
            ?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [selectedKey, items]);

    return (
        <div className={classNames(styles.group, className)} ref={listRef} role="tablist" aria-label={ariaLabel}>
            {items.map((item, index) => {
                const selected = item.key === selectedKey;
                const segmentClassName = classNames(styles.segment, {
                    [styles.segmentSelected]: selected,
                    [styles.segmentLast]: index === items.length - 1,
                });
                const content = (
                    <>
                        {item.icon}
                        <span className={styles.label}>{item.label}</span>
                    </>
                );

                if (item.to) {
                    return (
                        <Link
                            key={item.key}
                            className={segmentClassName}
                            to={item.to}
                            role="tab"
                            aria-selected={selected}
                            data-admin-chip-selected={selected}
                            onClick={() => onSelect?.(item.key)}
                        >
                            {content}
                        </Link>
                    );
                }

                return (
                    <button
                        key={item.key}
                        className={segmentClassName}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        data-admin-chip-selected={selected}
                        onClick={() => onSelect?.(item.key)}
                    >
                        {content}
                    </button>
                );
            })}
        </div>
    );
};

export default M3ConnectedButtonGroup;
