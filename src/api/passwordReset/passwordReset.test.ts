import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { passwordResetConfirmEndpoint, passwordResetRequestEndpoint } from '../../appConfig';
import { confirmAdminPasswordReset, requestAdminPasswordReset } from './passwordReset';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

describe('requestAdminPasswordReset', () => {
    beforeEach(() => {
        vi.mocked(fetchData).mockReset();
    });

    it('posts an unauthenticated admin reset request without accepting a redirect URL', async () => {
        vi.mocked(fetchData).mockResolvedValue(new Response(null, { status: 204 }));

        await requestAdminPasswordReset('admin@example.com', 'en');

        expect(fetchData).toHaveBeenCalledWith({
            url: passwordResetRequestEndpoint,
            method: FETCH_METHODS.POST,
            skipAuth: true,
            bodyData: JSON.stringify({
                username: 'admin@example.com',
                locale: 'en',
                application: 'ADMIN',
            }),
        });
    });

    it('posts the one-time token and new password without authentication', async () => {
        vi.mocked(fetchData).mockResolvedValue(new Response(null, { status: 204 }));

        await confirmAdminPasswordReset('one-time-token', 'SecurePass1!');

        expect(fetchData).toHaveBeenCalledWith({
            url: passwordResetConfirmEndpoint,
            method: FETCH_METHODS.POST,
            skipAuth: true,
            bodyData: JSON.stringify({ token: 'one-time-token', newPassword: 'SecurePass1!' }),
            responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
    });
});
