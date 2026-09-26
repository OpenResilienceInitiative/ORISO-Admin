import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../../appConfig', () => ({ tenantEndpoint: '/service/tenant/' }));
vi.mock('../fetchData', () => ({
    fetchData: mocks.fetchData,
    FETCH_METHODS: { POST: 'POST' },
    FETCH_ERRORS: { CATCH_ALL_SILENT: 'CATCH_ALL_SILENT' },
}));

import { sendTenantSmtpTestEmail } from './sendTenantSmtpTestEmail';

beforeEach(() => mocks.fetchData.mockReset());

it('sends no recipient, SMTP settings or message body', async () => {
    await sendTenantSmtpTestEmail('40');
    expect(mocks.fetchData).toHaveBeenCalledWith({
        url: '/service/tenant/40/smtp-test-deliveries',
        method: 'POST',
        responseHandling: ['CATCH_ALL_SILENT'],
    });
});
