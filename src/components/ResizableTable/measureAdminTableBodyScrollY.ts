/**
 * Computes antd Table `scroll.y` so the body fits the visible viewport.
 *
 * A fixed `100dvh - 280px` guess is too tall once mobile chrome (fixed bottom
 * nav + safe-area) is present: the page scrolls instead of `.ant-table-body`,
 * and the sticky header travels with it (#900).
 */

export const ADMIN_TABLE_SCROLL_Y_FALLBACK = 'calc(100dvh - 280px)';

/** Matches `data-admin-mobile-nav` on `AdminMobileNav`. */
export const ADMIN_MOBILE_NAV_SELECTOR = '[data-admin-mobile-nav]';

/** Matches `.table` / listing padding-bottom that sits below the body. */
const TABLE_BOTTOM_PADDING_PX = 24;

/** Floor so an empty / mid-layout measure cannot collapse the body. */
const MIN_BODY_SCROLL_Y_PX = 120;

const viewportHeight = (): number => window.visualViewport?.height ?? window.innerHeight;

const bottomChromeInset = (viewportBottom: number): number => {
    const mobileNav = document.querySelector(ADMIN_MOBILE_NAV_SELECTOR);
    if (!mobileNav) {
        return 0;
    }
    const navRect = mobileNav.getBoundingClientRect();
    // Only count a bar that is pinned to the viewport bottom (fixed mobile nav).
    if (navRect.bottom < viewportBottom - 1) {
        return 0;
    }
    return Math.max(0, viewportBottom - navRect.top);
};

const elementHeight = (root: ParentNode, selectors: string[]): number => {
    const match = selectors.map((selector) => root.querySelector(selector)).find(Boolean);
    return match ? match.getBoundingClientRect().height : 0;
};

/**
 * @returns Pixel height for antd `scroll.y` (table body only).
 */
export const measureAdminTableBodyScrollY = (tableRoot: HTMLElement): number => {
    const viewportBottom = viewportHeight();
    const tableTop = tableRoot.getBoundingClientRect().top;
    const availableForTable = viewportBottom - tableTop - bottomChromeInset(viewportBottom);

    // Sticky header lives in `.ant-table-header` when scroll.y is set; fall back
    // to thead before the sticky wrapper exists on the first paint.
    const headerHeight = elementHeight(tableRoot, ['.ant-table-header', '.ant-table-thead']);
    const paginationHeight = elementHeight(tableRoot, ['.ant-table-pagination']);

    const bodyY = Math.floor(availableForTable - headerHeight - paginationHeight - TABLE_BOTTOM_PADDING_PX);
    return Math.max(MIN_BODY_SCROLL_Y_PX, bodyY);
};
