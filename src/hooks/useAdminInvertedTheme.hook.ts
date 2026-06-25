import { useEffect } from 'react';
import { applyAdminInvertedTheme } from '../utils/applyAdminTheme';
import { ThemingSeedFields } from '../utils/themeSeeds';

export const useAdminInvertedTheme = (theming: ThemingSeedFields | null | undefined, isReady = true) => {
    useEffect(() => {
        if (!isReady) {
            return;
        }

        applyAdminInvertedTheme(theming);
    }, [theming, isReady]);
};
