import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../../appConfig', () => ({
    tenantAdminEndpoint: 'https://api.oriso.org/service/tenantadmin',
}));

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
    FETCH_METHODS: { GET: 'GET' },
    fetchData: mocks.fetchData,
}));

import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import { searchTenantData } from './searchTenantData';

describe('searchTenantData', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('uses wildcard search when search is empty', async () => {
        mocks.fetchData.mockResolvedValue({ _embedded: [], total: 0 });

        await searchTenantData({ search: '' });

        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: 'https://api.oriso.org/service/tenantadmin/search?page=1&perPage=10&query=*&field=NAME&order=ASC',
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
        });
    });

    it('uses wildcard search when search is whitespace', async () => {
        mocks.fetchData.mockResolvedValue({ _embedded: [], total: 0 });

        await searchTenantData({ search: '   ' });

        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: 'https://api.oriso.org/service/tenantadmin/search?page=1&perPage=10&query=*&field=NAME&order=ASC',
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
        });
    });

    it('encodes non-empty search values', async () => {
        mocks.fetchData.mockResolvedValue({ _embedded: [], total: 0 });

        await searchTenantData({ search: 'caritas berlin' });

        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: 'https://api.oriso.org/service/tenantadmin/search?page=1&perPage=10&query=caritas%20berlin&field=NAME&order=ASC',
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
        });
    });
});
