import { useLayoutEffect } from 'react';
import { applyAdminTheme, clearAdminInvertedThemeTokens } from '../utils/applyAdminTheme';
import type { AdminContrast } from '../utils/theme/orisoScheme';
import { ThemingSeedFields } from '../utils/themeSeeds';

export const useAdminTheme = (
    theming: ThemingSeedFields | null | undefined,
    isReady = true,
    scheme: 'light' | 'dark' = 'light',
    contrast: AdminContrast = 'standard',
) => {
    useLayoutEffect(() => {
        if (isReady) {
            applyAdminTheme(theming, document.documentElement, scheme, contrast);
        }

        return () => {
            clearAdminInvertedThemeTokens();
        };
    }, [theming, isReady, scheme, contrast]);
};
