export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'oriso-admin.language';

export const LANGUAGE_OPTIONS = [
    {
        value: 'en',
        shortLabelKey: 'language.short.en',
        labelKey: 'language.options.en',
    },
    {
        value: 'de',
        shortLabelKey: 'language.short.de',
        labelKey: 'language.options.de',
    },
] as const;

export const isSupportedLanguage = (value: unknown): value is SupportedLanguage => {
    return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
};

export const normalizeLanguage = (value?: string | null): SupportedLanguage | null => {
    if (!value) {
        return null;
    }

    const normalized = value.toLowerCase().split('-')[0];
    return isSupportedLanguage(normalized) ? normalized : null;
};

export const detectBrowserLanguage = (): SupportedLanguage => {
    return DEFAULT_LANGUAGE;
};

export const getStoredLanguage = (): SupportedLanguage | null => {
    if (globalThis.window === undefined) {
        return null;
    }

    try {
        return normalizeLanguage(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch {
        return null;
    }
};

export const getInitialLanguage = (): SupportedLanguage => {
    return getStoredLanguage() || DEFAULT_LANGUAGE;
};

export const storeLanguage = (language: SupportedLanguage): void => {
    if (globalThis.window === undefined) {
        return;
    }

    try {
        globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
        // Ignore storage errors in restricted browser contexts.
    }
};

export const updateDocumentLanguage = (language: SupportedLanguage): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.lang = language;
};
