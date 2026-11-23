import { useEffect, useState } from 'react';

const MOBILE_NAV_SELECTOR = '[data-admin-mobile-nav]';

/**
 * Height the phone bottom navigation occupies above the viewport bottom. The
 * open "Mehr" sheet and its scrim are left out: they cover the launcher on
 * purpose instead of pushing it up. 0 when no bottom navigation is shown.
 */
export const measureMobileNavInset = (): number => {
    const nav = document.querySelector(MOBILE_NAV_SELECTOR);
    if (!nav) {
        return 0;
    }
    let top = Number.POSITIVE_INFINITY;
    Array.from(nav.children).forEach((child) => {
        if (child.hasAttribute('data-admin-mobile-nav-menu') || child.hasAttribute('data-admin-mobile-nav-scrim')) {
            return;
        }
        const rect = child.getBoundingClientRect();
        if (rect.height > 0) {
            top = Math.min(top, rect.top);
        }
    });
    if (!Number.isFinite(top)) {
        return 0;
    }
    const viewportBottom = window.visualViewport?.height ?? window.innerHeight;
    return Math.max(0, Math.round(viewportBottom - top));
};

/** Live `measureMobileNavInset`, re-measured when the bar or the viewport changes. */
export const useMobileNavInset = (enabled: boolean): number => {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        const update = () => setInset(measureMobileNavInset());
        update();

        const nav = document.querySelector(MOBILE_NAV_SELECTOR);
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
        // A page can add a search or add row above the tab bar.
        const mutationObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(update);
        if (nav) {
            resizeObserver?.observe(nav);
            mutationObserver?.observe(nav, { childList: true });
        }
        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);
        return () => {
            resizeObserver?.disconnect();
            mutationObserver?.disconnect();
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
        };
    }, [enabled]);

    return inset;
};
