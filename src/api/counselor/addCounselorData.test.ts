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

    it('sends the personal-info fields including admin remarks when provided', async () => {
        await addCounselorData({
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            password: 'StrongPass1!',
            tenantId: '3',
            salutation: 'counsellor_female',
            position: 'Head of counselling centre',
            title: 'Dipl.-Soz.Päd.',
            adminRemarks: 'Internal note',
        });

        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(JSON.parse(request.bodyData as string)).toMatchObject({
            salutation: 'counsellor_female',
            position: 'Head of counselling centre',
            title: 'Dipl.-Soz.Päd.',
            adminRemarks: 'Internal note',
        });
    });

    it('omits adminRemarks when the form did not render the field', async () => {
        await addCounselorData({
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            password: 'StrongPass1!',
            tenantId: '3',
        });

        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(JSON.parse(request.bodyData as string)).not.toHaveProperty('adminRemarks');
    });
    /**
     * The create request used to drop the note, which made the dialog's absence switch
     * unsaveable: `CreateConsultantSaga` runs the same `validateAbsence` as the update path
     * and refuses a blank note for an absent counsellor (400
     * MISSING_ABSENCE_MESSAGE_FOR_ABSENT_USER).
     */
    it('sends the absence note when the counsellor is created absent', async () => {
        await addCounselorData({
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            password: 'StrongPass1!',
            tenantId: '3',
            absent: true,
            absenceMessage: 'Bin bis zum 30.09. nicht erreichbar.',
        });

        const body = vi.mocked(fetchData).mock.calls[0][0].bodyData as string;
        expect(JSON.parse(body)).toMatchObject({
            absent: true,
            absenceMessage: 'Bin bis zum 30.09. nicht erreichbar.',
        });
    });

    it('sends no note for a counsellor who is not absent', async () => {
        await addCounselorData({
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            password: 'StrongPass1!',
            tenantId: '3',
            absent: false,
            absenceMessage: 'left over from an earlier toggle',
        });

        expect(vi.mocked(fetchData).mock.calls[0][0].bodyData as string).not.toContain('absenceMessage');
    });
});
