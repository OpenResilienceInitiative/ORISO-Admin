import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import { searchTenantData } from './searchTenantData';
import { fetchData, FETCH_METHODS } from '../fetchData';
import { tenantAdminEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('searchTenantData', () => {
    it('builds the search URL from all params and unwraps the HAL list', async () => {
        fetchMock.mockResolvedValue({ total: 1, _embedded: [{ id: 9 }] });

        const result = await searchTenantData({ page: 2, search: 'foo', perPage: 5, sort: 'CREATED', dir: 'DESC' });

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/search?page=2&perPage=5&query=foo&field=CREATED&order=DESC`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
            }),
        );
        expect(result).toEqual({ total: 1, data: [{ id: 9 }] });
    });

    it('applies sensible defaults when called with an empty object', async () => {
        fetchMock.mockResolvedValue({ total: 0, _embedded: [] });

        await searchTenantData({});

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/search?page=1&perPage=10&query=&field=NAME&order=ASC`,
            }),
        );
    });
});
