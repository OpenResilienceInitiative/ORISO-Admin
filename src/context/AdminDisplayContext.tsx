import {
    createContext,
    useCallback,
    useContext,
    useLayoutEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { useAdminTheme } from '../hooks/useAdminTheme.hook';
import {
    readAdminDisplayPreferences,
    writeAdminDisplayPreferences,
    type AdminDisplayPreferences,
    type AdminSchemeChoice,
    type AdminTextScale,
} from '../utils/adminDisplayPreferences';
import type { AdminContrast } from '../utils/theme/orisoScheme';
import type { ThemingSeedFields } from '../utils/themeSeeds';

interface AdminDisplaySettings extends AdminDisplayPreferences {
    setContrast: (value: AdminContrast) => void;
    setSchemeChoice: (value: AdminSchemeChoice) => void;
    scheme: 'light' | 'dark';
    setTextScale: (value: AdminTextScale) => void;
}

const AdminDisplayContext = createContext<AdminDisplaySettings | null>(null);
export const useAdminDisplay = () => useContext(AdminDisplayContext);

const getSystemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
const subscribeToSystemScheme = (onChange: () => void) => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', onChange);
    return () => media?.removeEventListener?.('change', onChange);
};

export const AdminDisplayProvider = ({
    children,
    theming,
    isReady,
    sessionScope = null,
}: {
    children: ReactNode;
    theming?: ThemingSeedFields | null;
    isReady?: boolean;
    sessionScope?: string | null;
}) => {
    const [preferences, setPreferences] = useState(() => readAdminDisplayPreferences(sessionScope));
    const { contrast, schemeChoice, textScale } = preferences;
    const setContrast = useCallback((value: AdminContrast) => {
        setPreferences((previous) => ({ ...previous, contrast: value }));
    }, []);
    const setSchemeChoice = useCallback((value: AdminSchemeChoice) => {
        setPreferences((previous) => ({ ...previous, schemeChoice: value }));
    }, []);
    const setTextScale = useCallback((value: AdminTextScale) => {
        setPreferences((previous) => ({ ...previous, textScale: value }));
    }, []);
    useLayoutEffect(() => writeAdminDisplayPreferences(sessionScope, preferences), [sessionScope, preferences]);
    const systemDark = useSyncExternalStore(subscribeToSystemScheme, getSystemDark, () => false);
    const systemScheme = systemDark ? 'dark' : 'light';
    const scheme = schemeChoice === 'system' ? systemScheme : schemeChoice;
    useAdminTheme(theming, isReady, scheme, contrast);
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--admin-personal-text-scale', String(textScale));
        return () => {
            root.style.removeProperty('--admin-personal-text-scale');
        };
    }, [textScale]);

    useLayoutEffect(() => {
        if (contrast === 'standard') return undefined;
        const root = document.documentElement;
        root.dataset.adminPersonalContrast = contrast;
        return () => {
            delete root.dataset.adminPersonalContrast;
        };
    }, [contrast]);

    const value = useMemo(
        () => ({ ...preferences, scheme, setContrast, setSchemeChoice, setTextScale }),
        [preferences, scheme, setContrast, setSchemeChoice, setTextScale],
    );
    return <AdminDisplayContext.Provider value={value}>{children}</AdminDisplayContext.Provider>;
};
