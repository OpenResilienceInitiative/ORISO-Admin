import { useEffect } from 'react';
import { applyAdminInvertedTheme } from '../utils/applyAdminTheme';
import { ThemingSeedFields } from '../utils/themeSeeds';

export const useAdminInvertedTheme = (theming: ThemingSeedFields | null | undefined) => {
    useEffect(() => {
        applyAdminInvertedTheme(theming);
    }, [theming]);
};
