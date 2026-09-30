import { useLayoutEffect, useState, type RefObject } from 'react';
import { ADMIN_TABLE_SCROLL_Y_FALLBACK, measureAdminTableBodyScrollY } from './measureAdminTableBodyScrollY';

type ScrollY = string | number;

/**
 * Default antd `scroll.y` from live layout. When `enabled` is false (caller
 * passed an explicit `scroll.y`, including `'auto'`), the fallback string is
 * unused by the table and the observer does not run.
 */
export const useAdminTableScrollY = (tableRef: RefObject<HTMLElement | null>, enabled: boolean): ScrollY => {
    const [scrollY, setScrollY] = useState<ScrollY>(ADMIN_TABLE_SCROLL_Y_FALLBACK);

    useLayoutEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const root = tableRef.current;
        if (!root) {
            return undefined;
        }

        const update = () => {
            setScrollY(measureAdminTableBodyScrollY(root));
        };

        update();

        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => update()) : undefined;
        resizeObserver?.observe(root);

        const mobileNav = document.querySelector('[data-admin-mobile-nav]');
        if (mobileNav) {
            resizeObserver?.observe(mobileNav);
        }

        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
        };
    }, [enabled, tableRef]);

    return scrollY;
};
