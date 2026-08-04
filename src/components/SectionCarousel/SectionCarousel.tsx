import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { SectionCard } from './SectionCard';
import styles from './sectionCarousel.module.scss';

export interface SectionCarouselItem {
    /** Stable key for the tab and for `onSelect`. */
    key: string;
    /** Section name shown under the artwork. */
    label: string;
    /** Artwork source; falls back to `icon` when the section has none yet. */
    image?: string;
    /** Section glyph, used as the fallback and never shown alongside artwork. */
    icon?: ReactNode;
    /** Route to navigate to. Without it the card renders as a plain button. */
    to?: string;
}

export interface SectionCarouselProps {
    /** Accessible name of the section strip. */
    ariaLabel: string;
    items: SectionCarouselItem[];
    /** Key of the section currently open. */
    activeKey?: string;
    onSelect?: (key: string) => void;
    /**
     * Drain the colour from every card except the selected one. Off means all
     * cards keep full colour and only the selected card's outline marks it.
     */
    dimUnselected?: boolean;
    lang?: string;
    className?: string;
}

/**
 * Horizontally scrollable strip of section cards (Figma 61436:17414) — the
 * mobile stand-in for the desktop {@link AdminSegmentedTabs} pill row, which is
 * unusable at phone widths.
 *
 * Deliberately lighter than {@link CardDeck}: no arrow footer, because a 96px
 * card strip is swiped, not paged. Scroll snapping keeps a card from coming to
 * rest half off the edge.
 */
export const SectionCarousel = ({
    activeKey,
    ariaLabel,
    className,
    dimUnselected = false,
    items,
    lang,
    onSelect,
}: SectionCarouselProps) => {
    const listRef = useRef<HTMLUListElement>(null);
    const hasSelection = items.some((item) => item.key === activeKey);

    // Roving arrow keys, as a tablist is expected to have. Focus moves and the
    // card scrolls into view; selection still needs an explicit activation, so
    // browsing the strip never navigates by accident.
    const handleKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
        const offset = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: items.length - 1 - index }[event.key];

        if (offset === undefined) {
            return;
        }

        const next = Math.min(Math.max(index + offset, 0), items.length - 1);
        const target = listRef.current?.querySelectorAll<HTMLElement>('[data-section-card]')[next];

        if (!target) {
            return;
        }

        event.preventDefault();
        target.focus();

        // Focus moving is the contract; scrolling it into view is the polish.
        // Environments without a layout engine (jsdom, and older WebViews) have
        // no scrollIntoView, and keyboard navigation must not die with it.
        if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    };

    return (
        <div className={classNames(styles.carousel, className)}>
            <ul
                className={styles.list}
                ref={listRef}
                role="tablist"
                aria-label={ariaLabel}
                aria-orientation="horizontal"
            >
                {items.map((item, index) => {
                    const isActive = item.key === activeKey;
                    const card = (
                        <SectionCard
                            dimmed={dimUnselected && hasSelection && !isActive}
                            icon={item.icon}
                            image={item.image}
                            label={item.label}
                            lang={lang}
                            selected={isActive}
                        />
                    );
                    const shared = {
                        'aria-selected': isActive,
                        className: styles.item,
                        'data-section-card': true,
                        onKeyDown: (event: KeyboardEvent<HTMLElement>) => handleKeyDown(event, index),
                        role: 'tab',
                        // Only the selected card is tabbable; the arrow keys reach
                        // the rest. Otherwise a long strip becomes a tab-stop swamp.
                        tabIndex: isActive || (!hasSelection && index === 0) ? 0 : -1,
                    };

                    return (
                        <li key={item.key} className={styles.slot}>
                            {item.to ? (
                                // `Link`, not `NavLink`: role="tab" only ever takes
                                // aria-selected, never aria-current — but NavLink
                                // adds aria-current="page" on its own whenever `to`
                                // matches the router's current location, regardless
                                // of what this component's activeKey says (same
                                // fix as M3NavigationBar and MoreMenuSheet).
                                // eslint-disable-next-line react/jsx-props-no-spreading
                                <Link {...shared} to={item.to} onClick={() => onSelect?.(item.key)}>
                                    {card}
                                </Link>
                            ) : (
                                // eslint-disable-next-line react/jsx-props-no-spreading
                                <button {...shared} type="button" onClick={() => onSelect?.(item.key)}>
                                    {card}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default SectionCarousel;
