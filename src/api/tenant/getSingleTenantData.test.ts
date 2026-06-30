import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import { getSingleTenantData } from './getSingleTenantData';
import { fetchData, FETCH_METHODS } from '../fetchData';
import { tenantAdminEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('getSingleTenantData', () => {
    it('requests the admin tenant endpoint by id', async () => {
        fetchMock.mockResolvedValue({ id: 7, name: 'Nord' });

        await getSingleTenantData(7);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({ url: `${tenantAdminEndpoint}/7`, method: FETCH_METHODS.GET, skipAuth: false }),
        );
    });

    it('HTML-decodes the tenant name in the response', async () => {
        fetchMock.mockResolvedValue({ id: 7, name: 'Caritas &amp; Co &#43; Partner' });

        const result = await getSingleTenantData(7);

        expect(result.name).toBe('Caritas & Co + Partner');
    });

    it('tolerates a missing name', async () => {
        fetchMock.mockResolvedValue({ id: 7 });

        const result = await getSingleTenantData(7);

        expect(result.name).toBe('');
    });
});
