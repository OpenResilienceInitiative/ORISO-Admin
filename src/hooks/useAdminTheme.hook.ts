import { useEffect } from 'react';
import { applyAdminTheme, clearAdminInvertedThemeTokens } from '../utils/applyAdminTheme';
import { ThemingSeedFields } from '../utils/themeSeeds';

export const useAdminTheme = (theming: ThemingSeedFields | null | undefined, isReady = true) => {
    useEffect(() => {
        if (isReady) {
            applyAdminTheme(theming);
        }

        return () => {
            clearAdminInvertedThemeTokens();
        };
    }, [theming, isReady]);
};
