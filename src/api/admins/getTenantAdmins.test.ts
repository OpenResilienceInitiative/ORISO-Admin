import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

import { getTenantAdmins } from './getTenantAdmins';
import { fetchData, FETCH_METHODS } from '../fetchData';
import { tenantAdminsEndpoint } from '../../appConfig';

const fetchMock = vi.mocked(fetchData);

beforeEach(() => fetchMock.mockReset());

describe('getTenantAdmins', () => {
    it('loads every admin of one Tenant-Unit from the MT-04-08 list', async () => {
        fetchMock.mockResolvedValue([
            { id: 'a', firstname: 'Ada', lastname: 'One', email: 'ada@example.org' },
            { id: 'b', firstname: 'Bea', lastname: 'Two', email: 'bea@example.org' },
        ]);

        const admins = await getTenantAdmins(7);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${tenantAdminsEndpoint}?tenantId=7`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
            }),
        );
        expect(admins.map((admin) => admin.email)).toEqual(['ada@example.org', 'bea@example.org']);
    });

    it('treats a non-list response as no admins', async () => {
        fetchMock.mockResolvedValue({ data: [] });

        await expect(getTenantAdmins('7')).resolves.toEqual([]);
    });
});
