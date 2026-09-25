// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import translationDe from '../../locales/de/translation.json';
import translationEn from '../../locales/en/translation.json';

// ORISO-UserService#1264: AgencyService answers 409 `X-Reason: ONE_TOPIC_PER_AGENCY` when the
// global one-topic switch rejects an agency save. The admin must read why, not "something failed".
vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'access-token',
    tryRefreshAccessToken: vi.fn(),
}));
vi.mock('../auth/logout', () => ({ default: vi.fn() }));
vi.mock('../auth/accessSessionCookie', () => ({ getValueFromCookie: () => '' }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf-token' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'de', normalizeLanguage: (lang: string) => lang }));
vi.mock('../../appConfig', () => ({ default: { login: '/admin/login' }, CSRF_WHITELIST_HEADER: 'X-CSRF-Token' }));
const messageError = vi.hoisted(() => vi.fn());
vi.mock('antd', () => ({ message: { error: messageError } }));

// eslint-disable-next-line import/first
import { fetchData, FETCH_ERRORS, FETCH_METHODS, X_REASON } from '../fetchData';

const saveAgency = () => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            status: 409,
            headers: { get: (name: string) => (name === 'X-Reason' ? 'ONE_TOPIC_PER_AGENCY' : null) },
            json: async () => ({}),
        }),
    );
    // Same handling as updateAgencyData / addAgencyData.
    return fetchData({
        url: 'https://api.test/service/agencyadmin/agencies/1',
        method: FETCH_METHODS.PUT,
        responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL],
        bodyData: '{}',
    });
};

describe('agency save rejected by the one-topic-per-agency switch', () => {
    beforeAll(async () => {
        await i18next.init({
            lng: 'de',
            keySeparator: false,
            ns: ['translations'],
            defaultNS: 'translations',
            resources: { de: { translations: translationDe }, en: { translations: translationEn } },
        });
    });

    it('names the reason as a known X-Reason', () => {
        expect(X_REASON.ONE_TOPIC_PER_AGENCY).toBe('ONE_TOPIC_PER_AGENCY');
    });

    it('shows the German explanation instead of the generic error', async () => {
        await i18next.changeLanguage('de');
        await expect(saveAgency()).rejects.toThrow(FETCH_ERRORS.CATCH_ALL);
        expect(messageError).toHaveBeenLastCalledWith(
            expect.objectContaining({
                content: 'Diese Plattform erlaubt nur einen Fachbereich pro Beratungsstelle.',
            }),
        );
    });

    it('shows the English explanation', async () => {
        await i18next.changeLanguage('en');
        await expect(saveAgency()).rejects.toThrow(FETCH_ERRORS.CATCH_ALL);
        expect(messageError).toHaveBeenLastCalledWith(
            expect.objectContaining({ content: 'This platform allows only one topic per counselling centre.' }),
        );
    });
});
