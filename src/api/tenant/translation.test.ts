import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn(() => Promise.resolve({})) }));
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL', CATCH_ALL_SILENT: 'CATCH_ALL_SILENT' },
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT', POST: 'POST' },
    FETCH_SUCCESS: { CONTENT: 'CONTENT' },
    fetchData,
}));
vi.mock('../../appConfig', () => ({ tenantAdminEndpoint: '/service/tenantadmin' }));

// eslint-disable-next-line import/first
import { TranslationApiError, getTranslationKeys, setTranslationKey, translateLegalTexts } from './translation';

beforeEach(() => {
    // Braces matter: an expression-bodied arrow would RETURN the mock, and vitest
    // calls a returned function as after-test cleanup — invoking fetchData() once
    // more with a rejecting implementation and failing the test as "unhandled".
    fetchData.mockReset().mockResolvedValue({});
});

describe('getTranslationKeys', () => {
    it('GETs the keys endpoint with auth', () => {
        getTranslationKeys();
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/tenantadmin/translation/keys',
                method: 'GET',
                skipAuth: false,
            }),
        );
    });
});

describe('setTranslationKey', () => {
    it('PUTs the provider endpoint with the apiKey body', async () => {
        await setTranslationKey('openrouter', 'sk-123');
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/tenantadmin/translation/keys/openrouter',
                method: 'PUT',
                skipAuth: false,
                bodyData: JSON.stringify({ apiKey: 'sk-123' }),
            }),
        );
    });

    it('wraps a JSON error response into a TranslationApiError with the code', async () => {
        fetchData.mockRejectedValue({
            json: () =>
                Promise.resolve({ errorCode: 'TRANSLATION_KEY_INVALID', provider: 'mistral', message: 'bad key' }),
        });
        await expect(setTranslationKey('mistral', 'nope')).rejects.toMatchObject({
            errorCode: 'TRANSLATION_KEY_INVALID',
            provider: 'mistral',
        });
    });
});

describe('translateLegalTexts', () => {
    const request = {
        sourceLang: 'de',
        targetLangs: ['en', 'fr'],
        texts: { content: '<p>Hallo</p>' },
    };

    it('POSTs the translate endpoint with the request body', async () => {
        fetchData.mockResolvedValue({ translations: {}, provider: 'openrouter', model: 'x' });
        await translateLegalTexts(request);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/tenantadmin/translate',
                method: 'POST',
                skipAuth: false,
                bodyData: JSON.stringify(request),
            }),
        );
    });

    it('wraps a JSON error response into a TranslationApiError with the code', async () => {
        fetchData.mockRejectedValue({
            json: () => Promise.resolve({ errorCode: 'TRANSLATION_NO_CREDIT', provider: 'openrouter', message: '' }),
        });
        const rejection = await translateLegalTexts(request).catch((error) => error);
        expect(rejection).toBeInstanceOf(TranslationApiError);
        expect(rejection.errorCode).toBe('TRANSLATION_NO_CREDIT');
    });

    it('wraps non-JSON failures into a TranslationApiError without a code', async () => {
        fetchData.mockRejectedValue(new Error('network down'));
        const rejection = await translateLegalTexts(request).catch((error) => error);
        expect(rejection).toBeInstanceOf(TranslationApiError);
        expect(rejection.errorCode).toBeUndefined();
    });
});
