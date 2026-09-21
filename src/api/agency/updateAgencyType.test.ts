import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});

import updateAgencyType from './updateAgencyType';
import { FETCH_ERRORS } from '../fetchData';

const model = (teamAgency: unknown) => ({ id: '55', teamAgency } as any);
const input = (teamAgency: unknown) => ({ id: '55', teamAgency } as any);

const sentBody = () => JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData);

describe('updateAgencyType — no /changetype for an unchanged agency type', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue(undefined);
    });

    it('sends nothing when both sides carry the same boolean', async () => {
        await updateAgencyType(model(true), input(true));
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it("sends nothing when the model says 'true' and the form says true", async () => {
        // `getAgencyData` rewrites teamAgency to the strings 'true'/'false' for the agency list,
        // while the settings switch yields a real boolean. The old `===` saw a change here.
        await updateAgencyType(model('true'), input(true));
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it("sends nothing when the model says 'false' and the form says false", async () => {
        await updateAgencyType(model('false'), input(false));
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it('sends nothing when the model has no teamAgency at all and the form says false', async () => {
        // Absent means "default agency" — switching a default agency to default is the 409.
        await updateAgencyType(model(undefined), input(false));
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it('sends nothing when the patch carries no teamAgency field', async () => {
        // Narrow card patches (legal document publish, permission toggles) never change the type.
        const patch: Record<string, unknown> = { id: '55' };
        await updateAgencyType(model(true), patch as any);
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it('sends nothing when the patch carries a null teamAgency', async () => {
        await updateAgencyType(model(true), input(null));
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });
});

describe('updateAgencyType — a real change still reaches the backend', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue(undefined);
    });

    it('converts a default agency into a team agency exactly once', async () => {
        await updateAgencyType(model(false), input(true));
        expect(mocks.fetchData).toHaveBeenCalledTimes(1);
        expect(mocks.fetchData.mock.calls[0][0].url).toContain('/55/changetype');
        expect(sentBody()).toEqual({ agencyType: 'TEAM_AGENCY' });
    });

    it('converts a team agency back into a default agency exactly once', async () => {
        await updateAgencyType(model('true'), input(false));
        expect(mocks.fetchData).toHaveBeenCalledTimes(1);
        expect(sentBody()).toEqual({ agencyType: 'DEFAULT_AGENCY' });
    });
});

describe('updateAgencyType — a 409 is the requested state, not a failed save', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('resolves when the backend answers "already team agency"', async () => {
        mocks.fetchData.mockRejectedValue(new Error(FETCH_ERRORS.CONFLICT));
        await expect(updateAgencyType(model(false), input(true))).resolves.toBeUndefined();
    });

    it('declares CONFLICT so the 409 never reaches the generic error toast', async () => {
        mocks.fetchData.mockResolvedValue(undefined);
        await updateAgencyType(model(false), input(true));
        expect(mocks.fetchData.mock.calls[0][0].responseHandling).toContain(FETCH_ERRORS.CONFLICT);
    });

    it('still rejects on any other failure', async () => {
        mocks.fetchData.mockRejectedValue(new Error(FETCH_ERRORS.CATCH_ALL));
        await expect(updateAgencyType(model(false), input(true))).rejects.toThrow(FETCH_ERRORS.CATCH_ALL);
    });
});
