import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addCounselorData } from '../addCounselorData';
import { fetchData } from '../../fetchData';

vi.mock('../../fetchData', () => ({
    fetchData: vi.fn(),
    FETCH_METHODS: { POST: 'POST' },
    FETCH_ERRORS: {
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
        CONFLICT: 'CONFLICT',
        CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
        CATCH_ALL: 'CATCH_ALL',
    },
}));

vi.mock('../../agency/putAgenciesForCounselor', () => ({
    putAgenciesForCounselor: vi.fn().mockResolvedValue(undefined),
}));

const mockFetchData = vi.mocked(fetchData);

const plaintextUsername = 'counselor@example.com';

describe('addCounselorData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchData.mockResolvedValue({
            status: 200,
            json: () => Promise.resolve({ _embedded: { id: 'counselor-1' } }),
        });
    });

    it('continues to send a plaintext username in the POST payload', async () => {
        await addCounselorData({
            firstname: 'Test',
            lastname: 'Counselor',
            email: plaintextUsername,
            username: plaintextUsername,
            formalLanguage: false,
            absent: false,
            twoFactorAuth: false,
            isGroupchatConsultant: false,
            tenantId: '1',
        });

        const { bodyData } = mockFetchData.mock.calls[0][0];
        const payload = JSON.parse(bodyData);

        expect(payload.username).toBe(plaintextUsername);
        expect(payload.username).not.toMatch(/^enc\./);
    });
});
