import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, fetchData } from '../fetchData';
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
            expect.objectContaining({
                url: `${tenantAdminEndpoint}/7/permission-policies`,
                method: 'PUT',
                bodyData: JSON.stringify({ tenantId: 7, policies: {} }),
            }),
        );
    });

    it('keeps a silent read on the page when it is refused', async () => {
        vi.mocked(fetchData).mockResolvedValue({ tenantId: 7, policies: {} });
        await getTenantPermissionPolicies('7', { silent: true });

        const { responseHandling } = vi.mocked(fetchData).mock.calls[0][0];
        expect(responseHandling).toEqual(
            expect.arrayContaining([FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT]),
        );
    });
});
