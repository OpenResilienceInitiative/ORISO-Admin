import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import { deleteTenantData } from './deleteTenantData';
import { fetchData, FETCH_METHODS, FETCH_ERRORS } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('deleteTenantData', () => {
    it('DELETEs the tenant by id with NOT_ALLOWED handling', async () => {
        fetchMock.mockResolvedValue(undefined);

        await deleteTenantData(11);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantEndpoint}11`,
                method: FETCH_METHODS.DELETE,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.NOT_ALLOWED],
            }),
        );
    });
});
