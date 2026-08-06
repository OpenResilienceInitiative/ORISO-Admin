import { tenantAdminEndpoint } from '../../appConfig';
import { TranslateRequest, TranslateResponse, TranslationKeys, TranslationProvider } from '../../types/translation';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/**
 * Error of the translation endpoints, carrying the backend's `errorCode`
 * ({errorCode, provider, message}) so the UI can show a human message instead
 * of a raw code (see utils/translationErrors.ts).
 */
export class TranslationApiError extends Error {
    errorCode?: string;

    provider?: string;

    constructor(errorCode?: string, provider?: string, message?: string) {
        super(message || errorCode || 'TRANSLATION_FAILED');
        this.errorCode = errorCode;
        this.provider = provider;
        // Set the prototype explicitly so `instanceof` works after transpilation.
        Object.setPrototypeOf(this, TranslationApiError.prototype);
    }
}

/**
 * Turns a silent fetch rejection into a TranslationApiError. The endpoints answer
 * errors with a JSON body `{errorCode, provider, message}`; anything else (network
 * failure, unexpected shape) becomes a TranslationApiError without a code so the
 * UI falls back to its generic message.
 */
const toTranslationApiError = async (rejection: unknown): Promise<TranslationApiError> => {
    const maybeResponse = rejection as { json?: () => Promise<any> };
    if (maybeResponse && typeof maybeResponse.json === 'function') {
        try {
            const body = await maybeResponse.json();
            return new TranslationApiError(body?.errorCode, body?.provider, body?.message);
        } catch {
            return new TranslationApiError();
        }
    }
    return new TranslationApiError();
};

/** Masked API keys per provider (superadmin only). */
export const getTranslationKeys = (): Promise<TranslationKeys> =>
    fetchData({
        url: `${tenantAdminEndpoint}/translation/keys`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<TranslationKeys>;

/** Stores the API key of one provider (superadmin only). */
export const setTranslationKey = (provider: TranslationProvider, apiKey: string) =>
    fetchData({
        url: `${tenantAdminEndpoint}/translation/keys/${provider}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({ apiKey }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    }).catch(async (rejection) => {
        throw await toTranslationApiError(rejection);
    });

/**
 * Machine-translates the given texts (fieldKey -> HTML) from the source language into
 * all target languages in one call. Errors are surfaced as TranslationApiError with the
 * backend's errorCode — no toast is shown here so the calling UI controls the message.
 */
export const translateLegalTexts = (request: TranslateRequest): Promise<TranslateResponse> =>
    (
        fetchData({
            url: `${tenantAdminEndpoint}/translate`,
            method: FETCH_METHODS.POST,
            skipAuth: false,
            bodyData: JSON.stringify(request),
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_SUCCESS.CONTENT],
        }) as Promise<TranslateResponse>
    ).catch(async (rejection) => {
        throw await toTranslationApiError(rejection);
    });
