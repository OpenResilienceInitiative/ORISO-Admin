import { describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../fetchData')>()),
    fetchData: mocks.fetchData,
}));

import { deleteTenantData } from './deleteTenantData';
import { FETCH_METHODS, FETCH_ERRORS } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';
import { TenantDeletionError } from './tenantDeletionBlockers';

const fetchMock = mocks.fetchData;

describe('deleteTenantData', () => {
    it('DELETEs the tenant by id and lets the caller see a 409 and a 503', async () => {
        fetchMock.mockResolvedValue(undefined);

        await deleteTenantData(11);

        expect(fetchMock).toHaveBeenLastCalledWith(
            expect.objectContaining({
                url: `${tenantEndpoint}11`,
                method: FETCH_METHODS.DELETE,
                skipAuth: false,
                responseHandling: [
                    FETCH_ERRORS.NOT_ALLOWED,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.SERVICE_UNAVAILABLE,
                ],
            }),
        );
    });

    // ORISO-UserService#1466
    it('rejects a refusal with the counts of what is still left', async () => {
        const counts = {
            agencies: 1,
            consultants: 0,
            adviceSeekers: 0,
            agencyAdmins: 0,
            tenantAdmins: 1,
            openInvites: 0,
        };
        fetchMock.mockImplementation(() => Promise.reject(new Response(JSON.stringify(counts), { status: 409 })));

        const failure = await deleteTenantData(11).catch((error: unknown) => error);

        expect(failure).toEqual(expect.objectContaining({ reason: 'blocked' }));
        expect((failure as TenantDeletionError).blockers).toEqual(counts);
    });

    it('rejects an unavailable check as such', async () => {
        fetchMock.mockImplementation(() => Promise.reject(new Error(FETCH_ERRORS.SERVICE_UNAVAILABLE)));

        await expect(deleteTenantData(11)).rejects.toEqual(expect.objectContaining({ reason: 'unavailable' }));
    });
});
