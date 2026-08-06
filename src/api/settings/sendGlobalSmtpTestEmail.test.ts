import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../../appConfig', () => ({
    globalSmtpTestEmailEndpoint: '/api/settings/smtp/test',
}));

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE' },
    FETCH_METHODS: { POST: 'POST' },
    fetchData: mocks.fetchData,
}));

import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import { sendGlobalSmtpTestEmail } from './sendGlobalSmtpTestEmail';

describe('sendGlobalSmtpTestEmail', () => {
    it('posts the SMTP test payload and keeps bad-request response handling enabled', async () => {
        const payload = {
            host: 'smtp.example.org',
            port: 587,
            secure: false,
            username: 'mailer',
            password: 'secret',
            from: 'from@example.org',
            recipientEmail: 'recipient@example.org',
            emailThemeColor: '#0055aa',
        };
        mocks.fetchData.mockResolvedValue({ status: 204 });

        await expect(sendGlobalSmtpTestEmail(payload)).resolves.toEqual({ status: 204 });

        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: '/api/settings/smtp/test',
            method: FETCH_METHODS.POST,
            bodyData: JSON.stringify(payload),
            responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE],
        });
    });
});
