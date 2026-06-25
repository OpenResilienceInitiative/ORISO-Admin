import { useEffect } from 'react';
import { applyAdminInvertedTheme, clearAdminInvertedThemeTokens } from '../utils/applyAdminTheme';
import { ThemingSeedFields } from '../utils/themeSeeds';

export const useAdminInvertedTheme = (theming: ThemingSeedFields | null | undefined, isReady = true) => {
    useEffect(() => {
        if (isReady) {
            applyAdminInvertedTheme(theming);
        }

        return () => {
            clearAdminInvertedThemeTokens();
        };
    }, [theming, isReady]);
};
