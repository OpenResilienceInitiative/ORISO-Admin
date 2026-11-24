import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { addonApiCall } from './addonApiCall';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('addonApiCall', () => {
    it('calls the add-on route with the admin token and CSRF header', async () => {
        const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')));
        vi.stubGlobal('fetch', fetchMock);
        const api = addonApiCall(
            { apiBase: '/service/addons/demo/api' },
            { baseUrl: 'https://example.org', token: () => 'abc', csrfToken: () => 'csrf' },
        );

        await api('surveys', { method: 'POST', headers: { 'Content-Type': 'application/json' } });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('https://example.org/service/addons/demo/api/surveys');
        const headers = new Headers(init.headers);
        expect(headers.get('Authorization')).toBe('Bearer abc');
        expect(headers.get('X-CSRF-TOKEN')).toBe('csrf');
        expect(headers.get('Content-Type')).toBe('application/json');
        expect(init.method).toBe('POST');
    });
});

describe('addonApiCall after a 401', () => {
    const call = (refreshToken: () => Promise<boolean>) => {
        let accessToken = 'expired';
        const api = addonApiCall(
            { apiBase: '/api' },
            {
                baseUrl: 'https://example.org',
                token: () => accessToken,
                csrfToken: () => 'csrf',
                refreshToken: async () => {
                    accessToken = 'fresh';
                    return refreshToken();
                },
            },
        );
        return api('items', { method: 'POST', body: '{}' });
    };

    it('refreshes the token and retries once with the new one', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await call(() => Promise.resolve(true));

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [, retry] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(new Headers(retry.headers).get('Authorization')).toBe('Bearer fresh');
        expect(retry.body).toBe('{}');
    });

    it('returns the 401 when the session cannot be refreshed', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await call(() => Promise.resolve(false));

        expect(response.status).toBe(401);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry more than once', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await call(() => Promise.resolve(true));

        expect(response.status).toBe(401);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
