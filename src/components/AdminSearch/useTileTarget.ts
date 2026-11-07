import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { readTileTarget, revealTile } from './tileTarget';
import './tileHighlight.module.scss';

/**
 * Mount once inside the router (the protected layout does): when the URL carries
 * `#tile=<key>` the page that just opened scrolls to that tile and highlights it.
 */
export const useTileTarget = () => {
    const { hash, pathname } = useLocation();

    useEffect(() => {
        const tileKey = readTileTarget(hash);

        if (!tileKey) {
            return undefined;
        }

        const reducedMotion =
            typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        return revealTile(tileKey, { reducedMotion });
    }, [hash, pathname]);
};
