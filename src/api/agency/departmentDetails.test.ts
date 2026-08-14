import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn(() => Promise.resolve({})) }));
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT' },
    fetchData,
}));
vi.mock('../../appConfig', () => ({ agencyEndpointBase: '/service/agencyadmin/agencies' }));

// eslint-disable-next-line import/first
import { getDepartmentDetails, updateDepartmentDetails } from './departmentDetails';

beforeEach(() => fetchData.mockClear());

describe('getDepartmentDetails', () => {
    it('GETs the Fachbereich details endpoint with auth', () => {
        getDepartmentDetails(7, 42);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/7/topics/42/details',
                method: 'GET',
                skipAuth: false,
            }),
        );
    });
});

describe('updateDepartmentDetails', () => {
    it('PUTs the Fachbereich details endpoint with the overrides', () => {
        updateDepartmentDetails(7, 42, {
            openingHours: 'Di+Do 14-18 Uhr',
            phoneExtension: '-23',
            floorLocation: '3. OG, Raum 312',
        });
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/7/topics/42/details',
                method: 'PUT',
                skipAuth: false,
                bodyData: JSON.stringify({
                    openingHours: 'Di+Do 14-18 Uhr',
                    phoneExtension: '-23',
                    floorLocation: '3. OG, Raum 312',
                }),
            }),
        );
    });

    it('normalises empty strings to null so a cleared field inherits again', () => {
        // "persist only overrides": '' must clear the override, never be stored as an
        // empty override — the public resolution is a plain null check.
        updateDepartmentDetails(1, 2, { openingHours: '', phoneExtension: undefined, floorLocation: '' });
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                bodyData: JSON.stringify({ openingHours: null, phoneExtension: null, floorLocation: null }),
            }),
        );
    });
});
