import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { readTileTarget, revealTile } from './tileTarget';
import './tileHighlight.module.scss';

/**
 * Mount once inside the router (the protected layout does): when the URL carries
 * `#tile=<key>` the page that just opened scrolls to that tile and highlights it.
 */
export const useTileTarget = () => {
    // The key changes with every navigation, also to the very same URL: choosing the same result a
    // second time (after scrolling away) must reveal its tile again.
    const { hash, key, pathname } = useLocation();

    useEffect(() => {
        const tileKey = readTileTarget(hash);

        if (!tileKey) {
            return undefined;
        }

        const reducedMotion =
            typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        return revealTile(tileKey, { reducedMotion });
    }, [hash, key, pathname]);
};
