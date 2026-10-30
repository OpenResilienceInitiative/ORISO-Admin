import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData } from '../fetchData';
import { cancelCounselorDeletion } from './cancelCounselorDeletion';
import { pauseCounselorDeletion } from './pauseCounselorDeletion';

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: {
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
        CATCH_ALL: 'CATCH_ALL',
        CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
        FORBIDDEN: 'FORBIDDEN',
    },
    FETCH_METHODS: { POST: 'POST' },
    fetchData: vi.fn(),
}));

describe('deletion window calls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchData).mockResolvedValue({ status: 200 } as Response);
    });

    it('cancels a consultant deletion with a bodyless POST to the cancel endpoint', async () => {
        await cancelCounselorDeletion('consultant-1');

        const call = vi.mocked(fetchData).mock.calls[0][0];
        expect(call.url).toMatch(/\/service\/useradmin\/consultants\/consultant-1\/deletion\/cancel$/);
        expect(call.method).toBe('POST');
        expect(call.bodyData).toBeUndefined();
        expect(call.skipAuth).toBe(false);
    });

    it('lets the caller tell conflict, invalid input and missing access apart', async () => {
        await cancelCounselorDeletion('consultant-1');
        await pauseCounselorDeletion('consultant-1', { reason: 'Legal hold', months: 3 });

        vi.mocked(fetchData).mock.calls.forEach(([call]) => {
            expect(call.responseHandling).toEqual(
                expect.arrayContaining([
                    'CONFLICT_WITH_RESPONSE',
                    'BAD_REQUEST_WITH_RESPONSE',
                    'FORBIDDEN',
                    'CATCH_ALL',
                ]),
            );
        });
    });

    it('pauses a consultant deletion with the reason and number of months', async () => {
        await pauseCounselorDeletion('consultant-1', { reason: '  Legal hold ', months: 6 });

        const call = vi.mocked(fetchData).mock.calls[0][0];
        expect(call.url).toMatch(/\/service\/useradmin\/consultants\/consultant-1\/deletion\/pause$/);
        expect(call.method).toBe('POST');
        expect(JSON.parse(call.bodyData as string)).toEqual({ reason: 'Legal hold', months: 6 });
    });
});
