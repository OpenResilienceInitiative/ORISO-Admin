import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getCounselorById: vi.fn(),
    putAgenciesForCounselor: vi.fn(),
}));

vi.mock('../counselor/getCounselorById', () => ({ default: mocks.getCounselorById }));
vi.mock('./putAgenciesForCounselor', () => ({ putAgenciesForCounselor: mocks.putAgenciesForCounselor }));

// eslint-disable-next-line import/first
import { unassignAgencyFromConsultant } from './unassignAgencyFromConsultant';

describe('unassignAgencyFromConsultant (#1069)', () => {
    beforeEach(() => {
        mocks.getCounselorById.mockReset();
        mocks.putAgenciesForCounselor.mockReset();
        mocks.putAgenciesForCounselor.mockResolvedValue(undefined);
    });

    it('keeps every other agency of the counsellor and drops only this one', async () => {
        // PUT /consultants/{id}/agencies replaces the whole set, so the other agencies must be
        // re-sent or the counsellor would lose them too.
        mocks.getCounselorById.mockResolvedValue({ agencies: [{ id: 55 }, { id: 12 }], agencyIds: ['31'] });

        await unassignAgencyFromConsultant('55', 'c-7');

        expect(mocks.putAgenciesForCounselor).toHaveBeenCalledWith('c-7', ['31', '12'], { rejectForbidden: true });
    });

    it('sends an empty set when this agency was the only one', async () => {
        mocks.getCounselorById.mockResolvedValue({ agencies: [{ id: 55 }] });

        await unassignAgencyFromConsultant(55, 'c-7');

        expect(mocks.putAgenciesForCounselor).toHaveBeenCalledWith('c-7', [], { rejectForbidden: true });
    });

    it('does not write when the counsellor is no longer assigned', async () => {
        mocks.getCounselorById.mockResolvedValue({ agencies: [{ id: 12 }] });

        await unassignAgencyFromConsultant('55', 'c-7');

        expect(mocks.putAgenciesForCounselor).not.toHaveBeenCalled();
    });
});
