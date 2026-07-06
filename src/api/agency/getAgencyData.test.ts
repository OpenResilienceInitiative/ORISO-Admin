import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login' },
    agencyEndpointBase: 'https://api.test/service/agencyadmin/agencies',
}));

import getAgencyData from './getAgencyData';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('getAgencyData', () => {
    it('requests the agency list without a trailing slash before the query string', async () => {
        fetchMock.mockResolvedValue({
            total: 1,
            _embedded: [{ id: 1, deleteDate: null, offline: false }],
        });

        await getAgencyData({ current: 1, pageSize: 10 });

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
                url: 'https://api.test/service/agencyadmin/agencies?q=*&page=1&perPage=10&order=ASC&field=NAME',
            }),
        );
    });

    it('maps agency rows and encodes search terms', async () => {
        fetchMock.mockResolvedValue({
            total: 1,
            _embedded: [{ id: 2, deleteDate: null, offline: true, teamAgency: true }],
        });

        const result = await getAgencyData({ current: 2, pageSize: 25, search: 'Ber lin', sortBy: 'city', order: 'desc' });

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.test/service/agencyadmin/agencies?q=Ber%20lin&page=2&perPage=25&order=DESC&field=CITY',
            }),
        );
        expect(result).toEqual({
            total: 1,
            data: [
                expect.objectContaining({
                    id: 2,
                    status: 'CREATED',
                    online: false,
                    teamAgency: 'true',
                }),
            ],
        });
    });
});
