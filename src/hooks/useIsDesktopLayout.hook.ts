import { useEffect, useState } from 'react';

/**
 * Must stay identical to `@screen-md` in `styles/variables/_antd_defaults.less`,
 * which is where the sidebar/bottom-bar switch happens in CSS. A mismatch does
 * not degrade gracefully — it shows the desktop sidebar and the mobile bottom
 * bar at the same time, i.e. two navigation landmarks for the same links.
 */
export const DESKTOP_LAYOUT_QUERY = '(min-width: 768px)';

const matches = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(DESKTOP_LAYOUT_QUERY).matches
        : true;

/**
 * True while the viewport is wide enough for the desktop sidebar layout.
 *
 * Defaults to `true` only where `matchMedia` is missing entirely (SSR). Note
 * that this is NOT the case under test: `src/test/setup.ts` provides a stub
 * that answers `matches: false` to every query, so this hook reports *mobile*
 * in jsdom. Any test that needs the desktop layout has to override the stub —
 * see `useIsDesktopLayout.test.ts` for the pattern.
 */
export const useIsDesktopLayout = (): boolean => {
    const [isDesktop, setIsDesktop] = useState(matches);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mediaQueryList = window.matchMedia(DESKTOP_LAYOUT_QUERY);
        const update = () => setIsDesktop(mediaQueryList.matches);

        update();
        mediaQueryList.addEventListener('change', update);

        return () => mediaQueryList.removeEventListener('change', update);
    }, []);

    return isDesktop;
};

export default useIsDesktopLayout;
