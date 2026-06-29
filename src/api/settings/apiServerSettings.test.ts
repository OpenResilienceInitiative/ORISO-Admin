import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../../appConfig', () => ({
    serverSettingsEndpoint: '/api/settings',
}));

vi.mock('../fetchData', () => ({
    FETCH_METHODS: { GET: 'GET' },
    fetchData: mocks.fetchData,
}));

import { FETCH_METHODS } from '../fetchData';
import { apiServerSettings } from './apiServerSettings';

describe('apiServerSettings', () => {
    it('loads public server settings without auth', async () => {
        mocks.fetchData.mockResolvedValue({ useApiClusterSettings: { value: true } });

        await expect(apiServerSettings()).resolves.toEqual({ useApiClusterSettings: { value: true } });

        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: '/api/settings',
            method: FETCH_METHODS.GET,
            skipAuth: true,
            responseHandling: [],
        });
    });
});
