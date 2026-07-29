import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import {
    IdAllocationServiceError,
    agencyIdAllocationClient,
    agencyIdNextFreeEndpoint,
    idAllocationValidationEndpoint,
    tenantIdAllocationClient,
    tenantIdNextFreeEndpoint,
} from './idAllocation';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

describe('id allocation API client', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('pins the real backend endpoints (U3 aggregation + U1/U2 next-free)', () => {
        expect(idAllocationValidationEndpoint).toContain('/service/useradmin/id-allocation');
        expect(tenantIdNextFreeEndpoint).toContain('/service/tenantadmin/tenant-ids/next-free');
        expect(agencyIdNextFreeEndpoint).toContain('/service/agencyadmin/agencyids/next-free');
    });

    describe('checkIdAvailability (aggregated live validation, TEN-INV-U3)', () => {
        it('validates a tenant id via the aggregated endpoint', async () => {
            mocks.fetchData.mockResolvedValueOnce({ tenant: { id: 30, status: 'ASSIGNED' } });

            const result = await tenantIdAllocationClient.checkIdAvailability(30);

            expect(mocks.fetchData).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: FETCH_METHODS.GET,
                    url: `${idAllocationValidationEndpoint}?tenantId=30`,
                }),
            );
            expect(result).toEqual({ id: 30, state: 'ASSIGNED' });
        });

        it('validates an agency id via the agency entry of the same endpoint', async () => {
            mocks.fetchData.mockResolvedValueOnce({ agency: { id: 21, status: 'FREE' } });

            const result = await agencyIdAllocationClient.checkIdAvailability(21);

            expect(mocks.fetchData).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: FETCH_METHODS.GET,
                    url: `${idAllocationValidationEndpoint}?agencyId=21`,
                }),
            );
            expect(result).toEqual({ id: 21, state: 'FREE' });
        });

        it('maps a RESERVED entry', async () => {
            mocks.fetchData.mockResolvedValueOnce({ tenant: { id: 33, status: 'RESERVED' } });

            await expect(tenantIdAllocationClient.checkIdAvailability(33)).resolves.toEqual({
                id: 33,
                state: 'RESERVED',
            });
        });

        it('rejects with IdAllocationServiceError when the entry degraded to SERVICE_ERROR', async () => {
            mocks.fetchData.mockResolvedValueOnce({
                tenant: { id: 30, status: 'SERVICE_ERROR', upstreamStatus: 503 },
            });

            const error = await tenantIdAllocationClient.checkIdAvailability(30).catch((e: unknown) => e);

            expect(error).toBeInstanceOf(IdAllocationServiceError);
            expect((error as IdAllocationServiceError).upstreamStatus).toBe(503);
        });

        it('rejects with IdAllocationServiceError when the expected entry is missing', async () => {
            mocks.fetchData.mockResolvedValueOnce({});

            await expect(agencyIdAllocationClient.checkIdAvailability(7)).rejects.toBeInstanceOf(
                IdAllocationServiceError,
            );
        });
    });

    describe('nextFreeId (owning services, TEN-INV-U1/U2)', () => {
        it('steps tenant ids via TenantService with from/direction (UP)', async () => {
            mocks.fetchData.mockResolvedValueOnce({ id: 36 });

            const result = await tenantIdAllocationClient.nextFreeId({ from: 29, direction: 'up' });

            expect(mocks.fetchData).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: FETCH_METHODS.GET,
                    url: `${tenantIdNextFreeEndpoint}?from=29&direction=UP`,
                }),
            );
            expect(result).toEqual({ id: 36 });
        });

        it('anchors at 0 when no start value is given (smallest free id = AUTO candidate)', async () => {
            mocks.fetchData.mockResolvedValueOnce({ id: 21 });

            const result = await tenantIdAllocationClient.nextFreeId({ direction: 'up' });

            expect(mocks.fetchData).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: `${tenantIdNextFreeEndpoint}?from=0&direction=UP`,
                }),
            );
            expect(result).toEqual({ id: 21 });
        });

        it('steps agency ids via AgencyService with fromId/direction and maps agencyId', async () => {
            mocks.fetchData.mockResolvedValueOnce({ agencyId: 12 });

            const result = await agencyIdAllocationClient.nextFreeId({ from: 9, direction: 'down' });

            expect(mocks.fetchData).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: FETCH_METHODS.GET,
                    url: `${agencyIdNextFreeEndpoint}?fromId=9&direction=DOWN`,
                }),
            );
            expect(result).toEqual({ id: 12 });
        });

        it('maps a 404 (no free id in that direction) to id null', async () => {
            mocks.fetchData.mockRejectedValueOnce(new Error(FETCH_ERRORS.NO_MATCH));

            await expect(tenantIdAllocationClient.nextFreeId({ from: 99, direction: 'down' })).resolves.toEqual({
                id: null,
            });
        });

        it('passes other transport failures through as rejections', async () => {
            mocks.fetchData.mockRejectedValueOnce(new Error(FETCH_ERRORS.CATCH_ALL));

            await expect(agencyIdAllocationClient.nextFreeId({ from: 1, direction: 'up' })).rejects.toThrow(
                FETCH_ERRORS.CATCH_ALL,
            );
        });
    });
});
