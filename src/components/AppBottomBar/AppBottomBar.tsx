import type { Ref, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './appBottomBar.module.scss';

export interface AppBottomBarProps {
    /**
     * Search control for this screen — rendered bottom-left. Leave it out on
     * screens where searching has no meaning; the bar then gives its full width
     * to the navigation instead of showing a dead control.
     */
    search?: ReactNode;
    /**
     * Set while the search control is expanded. It hands the free width to the
     * search and lets the navigation shrink — pass `collapsed` to the
     * {@link M3NavigationBar} at the same time so what is left is the single
     * 48×48 overflow button. The search never displaces that button, and
     * opening the overflow menu never closes the search.
     */
    searchExpanded?: boolean;
    /** Navigation for this screen, usually an {@link M3NavigationBar}. */
    children: ReactNode;
    /**
     * Attached to the navigation slot, whose width is what decides how many
     * destinations fit — pass `useNavOverflow`'s ref here. Measuring the slot
     * rather than the segments inside it is what keeps that decision free of
     * feedback: the slot is sized by the bar, not by its own content.
     */
    navSlotRef?: Ref<HTMLDivElement>;
    className?: string;
}

/**
 * Mobile bottom bar (Figma 56576:34607): a 96px M3 surface-container shelf with
 * the search pill on the left and the navigation on the right.
 *
 * Layout only — it does **not** position itself. Fixing it to the viewport is
 * the layout wrapper's job, the same way {@link AdminSidebar} leaves its
 * `position: sticky` to `protectedLayout.less`. That keeps the bar renderable
 * inline in Storybook and keeps one owner for the content offset it needs.
 */
export const AppBottomBar = ({
    children,
    className,
    navSlotRef,
    search,
    searchExpanded = false,
}: AppBottomBarProps) => (
    <div className={classNames(styles.bar, className)}>
        {search && (
            <div className={classNames(styles.searchSlot, { [styles.searchSlotExpanded]: searchExpanded })}>
                {search}
            </div>
        )}
        <div className={classNames(styles.navSlot, { [styles.navSlotCollapsed]: searchExpanded })} ref={navSlotRef}>
            {children}
        </div>
    </div>
);

export default AppBottomBar;
