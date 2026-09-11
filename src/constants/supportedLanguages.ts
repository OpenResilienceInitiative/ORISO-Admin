export const SUPPORTED_LANGUAGE_CODES = ['de', 'en', 'fr', 'ru', 'tr', 'uk', 'ti'] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];
