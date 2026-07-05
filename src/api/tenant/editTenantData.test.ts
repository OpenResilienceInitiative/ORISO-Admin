import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import editTenantData from './editTenantData';
import { fetchData, FETCH_METHODS } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('editTenantData', () => {
    it('PUTs the serialized tenant to its id endpoint and returns the parsed body', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({ saved: true }) });
        const tenant = { id: 3, name: 'Updated' } as never;

        const result = await editTenantData(tenant);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantEndpoint}3`,
                method: FETCH_METHODS.PUT,
                skipAuth: false,
                bodyData: JSON.stringify(tenant),
            }),
        );
        expect(result).toEqual({ saved: true });
    });
});
