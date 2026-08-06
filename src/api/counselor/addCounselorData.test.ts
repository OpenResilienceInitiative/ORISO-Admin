import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData } from '../fetchData';
import { putAgenciesForCounselor } from '../agency/putAgenciesForCounselor';
import { addCounselorData } from './addCounselorData';

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: {
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
        CONFLICT: 'CONFLICT',
        CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
        CATCH_ALL: 'CATCH_ALL',
    },
    FETCH_METHODS: { POST: 'POST' },
    fetchData: vi.fn(),
}));

vi.mock('../agency/putAgenciesForCounselor', () => ({
    putAgenciesForCounselor: vi.fn(),
}));

describe('addCounselorData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchData).mockResolvedValue({
            json: vi.fn().mockResolvedValue({ _embedded: { id: 'consultant-1' } }),
        } as unknown as Response);
    });

    it('creates the consultant with agencies and topics in one request', async () => {
        await addCounselorData({
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            password: 'StrongPass1!',
            tenantId: '3',
            agencyIds: [5, 9],
            topicIds: [{ value: '7' }, { id: 12 }],
        });

        expect(fetchData).toHaveBeenCalledTimes(1);
        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(JSON.parse(request.bodyData as string)).toMatchObject({
            agencyIds: [5, 9],
            topicIds: [7, 12],
        });
        expect(putAgenciesForCounselor).not.toHaveBeenCalled();
    });

    it('serializes numeric topicIds from quick create', async () => {
        await addCounselorData({
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            password: 'StrongPass1!',
            tenantId: '3',
            agencyIds: [282],
            topicIds: [7, 12],
        });

        expect(fetchData).toHaveBeenCalledTimes(1);
        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(JSON.parse(request.bodyData as string)).toMatchObject({
            agencyIds: [282],
            topicIds: [7, 12],
        });
    });
});
