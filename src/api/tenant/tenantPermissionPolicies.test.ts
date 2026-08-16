import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantAdminEndpoint } from '../../appConfig';
import { fetchData } from '../fetchData';
import { getTenantPermissionPolicies, updateTenantPermissionPolicies } from './tenantPermissionPolicies';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

describe('tenant permission policy API', () => {
    beforeEach(() => vi.mocked(fetchData).mockReset());

    it('reads and writes only the tenant encoded in the contract', async () => {
        vi.mocked(fetchData).mockResolvedValue({ tenantId: 7, policies: {} });
        await getTenantPermissionPolicies('7');
        await updateTenantPermissionPolicies({ tenantId: 7, policies: {} });

        expect(fetchData).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ url: `${tenantAdminEndpoint}/7/permission-policies`, method: 'GET' }),
        );
        expect(fetchData).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ url: `${tenantAdminEndpoint}/7/permission-policies`, method: 'PUT' }),
        );
    });
});
