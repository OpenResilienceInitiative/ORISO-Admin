import { buildCookieAttributes } from '../api/auth/buildCookieAttributes';
import { runtimeConfig } from '../config/runtimeConfig';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'oriso-admin.language';
export const LANGUAGE_COOKIE_KEY = 'oriso-admin.language';
// ConsultingTypeService (TranslationService.getCurrentLanguageContext) resolves
// localized topic/consulting-type names from the `lang` cookie only — it ignores
// the Accept-Language header and defaults to German. The admin must mirror its
// language into this cookie or the backend keeps returning German names (#564).
export const BACKEND_LANGUAGE_COOKIE_KEY = 'lang';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

    const browserLanguage = navigator.languages?.[0] || navigator.language || '';
    return browserLanguage.toLowerCase().startsWith('de') ? 'de' : DEFAULT_LANGUAGE;
};

const getCookieValue = (name: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const targetName = `${name}=`;
    const cookieParts = decodeURIComponent(document.cookie).split(';');

    for (let index = 0; index < cookieParts.length; index += 1) {
        const cookiePart = cookieParts[index].trim();

        if (cookiePart.indexOf(targetName) === 0) {
            return cookiePart.substring(targetName.length);
        }
    }

    return null;
};

const setCookieValue = (name: string, value: string): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.cookie = `${name}=${encodeURIComponent(
        value,
    )};path=/;SameSite=Lax;Max-Age=${LANGUAGE_COOKIE_MAX_AGE_SECONDS}`;
};

// The backend `lang` cookie has to reach the API, which is served from a
// sibling subdomain (e.g. api.oriso-dev.site) — a host-only cookie would never
// be sent there. Scope it exactly like the auth cookies (shared Domain + Secure
// via runtimeConfig) so it rides along with the same requests.
const setBackendLanguageCookie = (value: string): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const attributes = buildCookieAttributes({
        cookieSecure: runtimeConfig.cookieSecure,
        cookieDomain: runtimeConfig.cookieDomain,
    });
    document.cookie = `${BACKEND_LANGUAGE_COOKIE_KEY}=${encodeURIComponent(value)}${attributes}`;
};

export const getStoredLanguage = (): SupportedLanguage | null => {
    if (globalThis.window === undefined) {
        return null;
    }

    const cookieLanguage = normalizeLanguage(getCookieValue(LANGUAGE_COOKIE_KEY));

    if (cookieLanguage) {
        return cookieLanguage;
    }

    try {
        return normalizeLanguage(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch {
        return null;
    }
};

export const getInitialLanguage = (): SupportedLanguage => {
    return getStoredLanguage() || detectBrowserLanguage();
};

export const storeLanguage = (language: SupportedLanguage): void => {
    if (globalThis.window === undefined) {
        return;
    }

    setCookieValue(LANGUAGE_COOKIE_KEY, language);
    // Also set the cookie the backend reads, so localized names match the UI.
    setBackendLanguageCookie(language);

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
