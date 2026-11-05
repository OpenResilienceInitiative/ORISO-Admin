// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ArgsProps } from 'antd/es/message/interface';
import { message } from 'antd';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from './fetchData';
import { registerTransportFeedbackOwner } from './transportFeedback';

const refresh = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());
vi.mock('antd', () => ({ message: { error: vi.fn() } }));
vi.mock('./auth/auth', () => ({ getAccessTokenForRequests: () => 'test-access', tryRefreshAccessToken: refresh }));
vi.mock('./auth/logout', () => ({ default: logout }));
vi.mock('../utils/generateCsrfToken', () => ({ default: () => 'test-csrf' }));
vi.mock('../appConfig', () => ({ CSRF_WHITELIST_HEADER: '' }));
vi.mock('i18next', () => ({ default: { language: 'en', t: (key: unknown) => key } }));

const disposers: (() => void)[] = [];
afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

const mount = () => {
    const close = vi.fn();
    const error = vi.fn<(notice: ArgsProps) => () => void>(() => close);
    const dispose = registerTransportFeedbackOwner({ error });
    disposers.push(dispose);
    return { error, dispose };
};
const request = () =>
    fetchData({
        url: 'https://api.example.test/service/control',
        method: FETCH_METHODS.GET,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

describe('real transport request-origin feedback', () => {
    it('retains A through a pending refresh and retry after B mounts, with original logout/rejection', async () => {
        // Document identity only: no React/DOM rendering in this HTTP contract test.
        vi.stubGlobal('window', {});
        vi.stubGlobal('document', {});
        const a = mount();
        let finishRefresh: (value: boolean) => void = () => undefined;
        refresh.mockImplementation(
            () =>
                new Promise<boolean>((resolve) => {
                    finishRefresh = resolve;
                }),
        );
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal('fetch', fetchMock);
        const pending = request();
        const rejected = expect(pending).rejects.toThrow(FETCH_ERRORS.UNAUTHORIZED);
        await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
        a.dispose();
        const b = mount();
        finishRefresh(true);
        await rejected;
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(logout).toHaveBeenCalledExactlyOnceWith(true);
        expect(a.error).not.toHaveBeenCalled();
        expect(b.error).not.toHaveBeenCalled();
        expect(message.error).not.toHaveBeenCalled();
    });

    it('preserves the bootstrap reject-only responseHandling[] contract without a generic toast', async () => {
        vi.stubGlobal('window', {});
        vi.stubGlobal('document', {});
        const api = mount();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
        await expect(
            fetchData({
                url: 'https://api.example.test/service/settings',
                method: FETCH_METHODS.GET,
                skipAuth: true,
                responseHandling: [],
            }),
        ).rejects.toThrow('API call error: 500');
        expect(api.error).not.toHaveBeenCalled();
        expect(message.error).not.toHaveBeenCalled();
    });
});
