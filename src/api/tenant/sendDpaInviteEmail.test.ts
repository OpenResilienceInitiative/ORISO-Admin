import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../../appConfig', () => ({
    dpaInviteEmailEndpoint: '/service/useradmin/dpa-invites/email',
}));

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { BAD_REQUEST: 'BAD_REQUEST', CATCH_ALL_SILENT: 'CATCH_ALL_SILENT' },
    FETCH_METHODS: { POST: 'POST' },
    fetchData: mocks.fetchData,
}));

import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import { sendDpaInviteEmail } from './sendDpaInviteEmail';

describe('sendDpaInviteEmail', () => {
    it('posts the recipient and opaque signing invitation through the authenticated UserService endpoint', async () => {
        const payload = {
            tenantId: 84,
            recipientEmail: 'bart.simpson@oriso.org',
            signLink: 'https://app.oriso-dev.site/dpa-sign/single-use-token',
            expiresAt: '2026-07-21T12:00:00+02:00',
        };
        mocks.fetchData.mockResolvedValue(new Response(null, { status: 204 }));

        await sendDpaInviteEmail(payload);

        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: '/service/useradmin/dpa-invites/email',
            method: FETCH_METHODS.POST,
            bodyData: JSON.stringify(payload),
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
    });
});
