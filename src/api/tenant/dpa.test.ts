import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn(() => Promise.resolve({})) }));
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL', CATCH_ALL_SILENT: 'CATCH_ALL_SILENT' },
    FETCH_SUCCESS: { CONTENT: 'CONTENT' },
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT' },
    fetchData,
}));
vi.mock('../../appConfig', () => ({ tenantAdminEndpoint: '/service/tenantadmin' }));

// eslint-disable-next-line import/first
import { getDpaVersions } from './getDpaVersions';
// eslint-disable-next-line import/first
import { publishDpa } from './publishDpa';

beforeEach(() => fetchData.mockClear());

describe('getDpaVersions', () => {
    it('GETs the tenant versions endpoint with auth', () => {
        getDpaVersions(7);
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/tenantadmin/7/dpa/versions',
                method: 'GET',
                skipAuth: false,
            }),
        );
    });
});

describe('publishDpa', () => {
    it('PUTs the DPA endpoint with the JSON-serialised content map', () => {
        publishDpa(7, { de: '<p>x</p>', en: '<p>y</p>' }, '2099-10-30T15:00:00+01:00');
        expect(fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: '/service/tenantadmin/7/dpa/v2?signingDeadlineAt=2099-10-30T15%3A00%3A00%2B01%3A00',
                method: 'PUT',
                skipAuth: false,
                bodyData: JSON.stringify({ de: '<p>x</p>', en: '<p>y</p>' }),
            }),
        );
    });
});
