import { beforeEach, describe, expect, it, vi } from 'vitest';
import { editAgencyAdminData } from '../editAgencyAdminData';
import { fetchData } from '../../fetchData';
import { putAgenciesForAgencyAdmin } from '../../agency/putAgenciesForAdmin';

vi.mock('../../fetchData', () => ({
    fetchData: vi.fn(),
    FETCH_METHODS: { PUT: 'PUT' },
    FETCH_ERRORS: {
        CATCH_ALL: 'CATCH_ALL',
    },
}));

vi.mock('../../agency/putAgenciesForAdmin', () => ({
    putAgenciesForAgencyAdmin: vi.fn().mockResolvedValue(undefined),
}));

const mockFetchData = vi.mocked(fetchData);
const mockPutAgencies = vi.mocked(putAgenciesForAgencyAdmin);

const plaintextUsername = 'admin@example.com';

describe('editAgencyAdminData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchData.mockResolvedValue({
            status: 200,
            json: () => Promise.resolve({ _embedded: { id: 'admin-1', username: plaintextUsername } }),
        });
    });

    it('sends a plaintext username in the PUT payload', async () => {
        await editAgencyAdminData('admin-1', {
            firstname: 'Test',
            lastname: 'Admin',
            email: plaintextUsername,
            username: plaintextUsername,
            twoFactorAuth: false,
            agencies: [],
        } as any);

        expect(mockPutAgencies).toHaveBeenCalledWith('admin-1', []);

        const { bodyData } = mockFetchData.mock.calls[0][0];
        const payload = JSON.parse(bodyData);

        expect(payload.username).toBe(plaintextUsername);
        expect(payload.username).not.toMatch(/^enc\./);
    });
});
