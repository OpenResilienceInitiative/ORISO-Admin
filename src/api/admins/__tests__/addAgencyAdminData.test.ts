import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addAgencyAdminData } from '../addAgencyAdminData';
import { fetchData } from '../../fetchData';

vi.mock('../../fetchData', () => ({
    fetchData: vi.fn(),
    FETCH_METHODS: { POST: 'POST' },
    FETCH_ERRORS: {
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
        CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
        CATCH_ALL: 'CATCH_ALL',
    },
}));

vi.mock('../../agency/putAgenciesForAdmin', () => ({
    putAgenciesForAgencyAdmin: vi.fn().mockResolvedValue(undefined),
}));

const mockFetchData = vi.mocked(fetchData);

const plaintextUsername = 'admin@example.com';

describe('addAgencyAdminData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchData.mockResolvedValue(
            new Response(JSON.stringify({ _embedded: { id: 'admin-1' } }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );
    });

    it('sends a plaintext username in the POST payload', async () => {
        await addAgencyAdminData({
            firstname: 'Test',
            lastname: 'Admin',
            email: plaintextUsername,
            username: plaintextUsername,
            twoFactorAuth: false,
            tenantId: '1',
        });

        const { bodyData } = mockFetchData.mock.calls[0][0];
        const payload = JSON.parse(bodyData);

        expect(payload.username).toBe(plaintextUsername);
        expect(payload.username).not.toMatch(/^enc\./);
    });
});
