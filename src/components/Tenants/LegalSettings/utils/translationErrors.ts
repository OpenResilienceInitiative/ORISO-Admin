import { TranslationApiError } from '../../../../api/tenant/translation';

/**
 * Maps the translation endpoints' error codes to human i18n messages (DE/EN in the
 * locale files). Raw error codes are never shown to admins — anything unknown falls
 * back to the generic message.
 */
const ERROR_KEY_BY_CODE: Record<string, string> = {
    TRANSLATION_NOT_CONFIGURED: 'legal.translation.error.notConfigured',
    TRANSLATION_KEY_INVALID: 'legal.translation.error.keyInvalid',
    TRANSLATION_NO_CREDIT: 'legal.translation.error.noCredit',
    TRANSLATION_RATE_LIMITED: 'legal.translation.error.rateLimited',
    TRANSLATION_PROVIDER_UNAVAILABLE: 'legal.translation.error.providerUnavailable',
};

export const TRANSLATION_DEFAULT_ERROR_KEY = 'legal.translation.error.default';

/** The i18n key of the human message for a failed translation call. */
export const getTranslationErrorKey = (error: unknown): string => {
    if (error instanceof TranslationApiError && error.errorCode) {
        return ERROR_KEY_BY_CODE[error.errorCode] ?? TRANSLATION_DEFAULT_ERROR_KEY;
    }
    return TRANSLATION_DEFAULT_ERROR_KEY;
};
