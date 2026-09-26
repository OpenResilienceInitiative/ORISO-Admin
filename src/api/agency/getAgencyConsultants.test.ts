import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});

// eslint-disable-next-line import/first
import { getAgencyConsultants, hasAgencyConsultants } from './getAgencyConsultants';

describe('getAgencyConsultants (#1069)', () => {
    beforeEach(() => mocks.fetchData.mockReset());

    it('unwraps the HAL list into the assigned counsellors, skipping deleted accounts', async () => {
        mocks.fetchData.mockResolvedValue({
            total: 3,
            _embedded: [
                { _embedded: { id: 'a', firstname: 'Erika', lastname: 'Muster', email: 'e@x.org', deleteDate: null } },
                { _embedded: { id: 'b', firstname: 'Max', lastname: 'Admin', email: 'm@x.org' } },
                { _embedded: { id: 'c', firstname: 'Gone', lastname: 'Away', deleteDate: '2026-09-01' } },
            ],
        });

        await expect(getAgencyConsultants('55')).resolves.toEqual([
            { id: 'a', firstname: 'Erika', lastname: 'Muster', email: 'e@x.org' },
            { id: 'b', firstname: 'Max', lastname: 'Admin', email: 'm@x.org' },
        ]);
        expect(mocks.fetchData.mock.calls[0][0].url).toContain('/service/useradmin/agencies/55/consultants');
    });

    it('returns an empty list when the agency has nobody', async () => {
        mocks.fetchData.mockResolvedValue({ total: 0, _embedded: [] });

        await expect(getAgencyConsultants('55')).resolves.toEqual([]);
    });

    it('keeps the boolean check for existing callers', async () => {
        mocks.fetchData.mockResolvedValue({ total: 2, _embedded: [] });

        await expect(hasAgencyConsultants('55')).resolves.toBe(true);
    });
});
