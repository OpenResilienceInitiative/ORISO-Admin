import { afterEach, describe, expect, it, vi } from 'vitest';
import { message } from 'antd';
import { sendGlobalSmtpTestEmail } from './sendGlobalSmtpTestEmail';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';

vi.mock('../../appConfig', () => ({
    default: {},
    CSRF_WHITELIST_HEADER: '',
    globalSmtpTestEmailEndpoint: 'http://localhost/smtp/test',
}));
vi.mock('../auth/auth', () => ({ getAccessTokenForRequests: () => null, tryRefreshAccessToken: vi.fn() }));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('sendGlobalSmtpTestEmail', () => {
    it('posts only the recipient through the actual shared request client', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        vi.stubGlobal('fetch', fetch);
        const result = await sendGlobalSmtpTestEmail({ recipientEmail: 'recipient@example.org' });
        expect(result.status).toBe(204);
        const request = fetch.mock.calls[0][0] as Request;
        expect(request.method).toBe('POST');
        expect(await request.json()).toEqual({ recipientEmail: 'recipient@example.org' });
    });

    it.each([400, 502])('retains the safe backend message on %i without a duplicate global toast', async (status) => {
        const backendMessage =
            status === 400 ? 'EMAIL_BRANDING_NAME is missing' : 'Platform SMTP Admin Settings are unavailable';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ message: backendMessage }), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                }),
            ),
        );
        const globalToast = vi.spyOn(message, 'error');
        const error = await sendGlobalSmtpTestEmail({ recipientEmail: 'recipient@example.org' }).catch(
            (failure) => failure,
        );
        expect(await extractApiErrorMessage(error)).toBe(backendMessage);
        expect(globalToast).not.toHaveBeenCalled();
    });
});
