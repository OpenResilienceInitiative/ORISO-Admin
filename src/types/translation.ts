/** Machine-translation providers supported by the tenant service (TenantService PR #55). */
export const TRANSLATION_PROVIDERS = ['openrouter', 'mistral'] as const;
export type TranslationProvider = (typeof TRANSLATION_PROVIDERS)[number];

/** Masked API keys per provider as returned by GET /tenantadmin/translation/keys (e.g. `sk-…abcd`). */
export type TranslationKeys = Partial<Record<TranslationProvider, string | null>>;

/** Request body of POST /tenantadmin/translate. */
export interface TranslateRequest {
    sourceLang: string;
    targetLangs: string[];
    provider?: TranslationProvider;
    /** fieldKey -> HTML of the source language. */
    texts: Record<string, string>;
}

/** Response body of POST /tenantadmin/translate. */
export interface TranslateResponse {
    /** lang -> (fieldKey -> translated HTML). */
    translations: Record<string, Record<string, string>>;
    provider: string;
    model: string;
}

/** Error codes of the translation endpoints ({errorCode, provider, message}). */
export const TRANSLATION_ERROR_CODES = [
    'TRANSLATION_NOT_CONFIGURED',
    'TRANSLATION_KEY_INVALID',
    'TRANSLATION_NO_CREDIT',
    'TRANSLATION_RATE_LIMITED',
    'TRANSLATION_PROVIDER_UNAVAILABLE',
] as const;
export type TranslationErrorCode = (typeof TRANSLATION_ERROR_CODES)[number];
