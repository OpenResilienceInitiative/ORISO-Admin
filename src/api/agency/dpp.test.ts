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
import { publishDepartmentDpp } from './publishDepartmentDpp';
// eslint-disable-next-line import/first
import { getDepartmentDpp } from './getDepartmentDpp';

beforeEach(() => fetchData.mockClear());

describe('getDepartmentDpp', () => {
    it('GETs the Fachbereich DPP endpoint with auth', () => {
        getDepartmentDpp(7, 42);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/7/topics/42/dpp',
                method: 'GET',
                skipAuth: false,
            }),
        );
    });
});

describe('publishDepartmentDpp', () => {
    it('PUTs the Fachbereich DPP endpoint with the content map and publish flag', () => {
        publishDepartmentDpp(7, 42, { de: '<p>x</p>', en: '<p>y</p>' }, true);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/7/topics/42/dpp',
                method: 'PUT',
                skipAuth: false,
                bodyData: JSON.stringify({ content: { de: '<p>x</p>', en: '<p>y</p>' }, publish: true }),
            }),
        );
    });

    it('serialises publish=false for a draft-save', () => {
        publishDepartmentDpp(1, 2, { de: '<p>draft</p>' }, false);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/agencyadmin/agencies/1/topics/2/dpp',
                bodyData: JSON.stringify({ content: { de: '<p>draft</p>' }, publish: false }),
            }),
        );
    });
});
