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
    if (typeof navigator === 'undefined') {
        return DEFAULT_LANGUAGE;
    }

    const candidates = [...(navigator.languages || []), navigator.language].filter(Boolean);
    const hasGermanCandidate = candidates.some((candidate) => normalizeLanguage(candidate) === 'de');

    return hasGermanCandidate ? 'de' : DEFAULT_LANGUAGE;
};

export const getStoredLanguage = (): SupportedLanguage | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
};

export const getInitialLanguage = (): SupportedLanguage => {
    return getStoredLanguage() || detectBrowserLanguage();
};

export const storeLanguage = (language: SupportedLanguage): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export const updateDocumentLanguage = (language: SupportedLanguage): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.lang = language;
};
