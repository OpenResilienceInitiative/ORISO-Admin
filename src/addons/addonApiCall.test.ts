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
