import { afterEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';
import { fetchData, FETCH_ERRORS } from '../fetchData';
import { deleteTenant, MAIN_TENANT_NOT_DELETABLE } from './tenantDeletion';

vi.mock('../fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});

const conflict = (reason: string) => new Response(null, { status: 409, headers: { [FETCH_ERRORS.X_REASON]: reason } });

describe('deleteTenant (ORISO-Admin#1525)', () => {
    afterEach(() => vi.clearAllMocks());

    it('hands back what TenantService and UserService did', async () => {
        (fetchData as Mock).mockResolvedValue({ complete: true, agencies: 2 });

        await expect(deleteTenant(21)).resolves.toEqual({
            result: 'deleted',
            details: { complete: true, agencies: 2, failures: [] },
        });
    });

    it('tells the main tenant apart from any other conflict', async () => {
        (fetchData as Mock).mockRejectedValueOnce(conflict(MAIN_TENANT_NOT_DELETABLE));
        await expect(deleteTenant(21)).resolves.toEqual({ result: 'mainTenant' });

        (fetchData as Mock).mockRejectedValueOnce(conflict('SOMETHING_ELSE'));
        await expect(deleteTenant(21)).resolves.toEqual({ result: 'failed', status: 409 });
    });

    it('maps transport errors to their own outcomes', async () => {
        (fetchData as Mock).mockRejectedValueOnce(new Error(FETCH_ERRORS.SERVICE_UNAVAILABLE));
        await expect(deleteTenant(21)).resolves.toEqual({ result: 'markedOnly' });
        (fetchData as Mock).mockRejectedValueOnce(new Error(FETCH_ERRORS.NOT_ALLOWED));
        await expect(deleteTenant(21)).resolves.toEqual({ result: 'forbidden' });
        (fetchData as Mock).mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));
        await expect(deleteTenant(21)).resolves.toEqual({ result: 'notFound' });
    });
});
