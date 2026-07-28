import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import {
    IdReservationConflictError,
    agencyIdAllocationEndpoint,
    createIdAllocationClient,
    tenantIdAllocationEndpoint,
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

const client = createIdAllocationClient('https://tenant.example/service/tenantadmin/id-allocation');

describe('id allocation API client', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('exposes tenant and agency endpoints on their owning services', () => {
        expect(tenantIdAllocationEndpoint).toContain('/service/tenantadmin/id-allocation');
        expect(agencyIdAllocationEndpoint).toContain('/service/agencyadmin/id-allocation');
    });

    it('checks the availability of a single id', async () => {
        mocks.fetchData.mockResolvedValueOnce({ id: 30, state: 'ASSIGNED' });

        const result = await client.checkIdAvailability(30);

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: 'https://tenant.example/service/tenantadmin/id-allocation/30',
            }),
        );
        expect(result).toEqual({ id: 30, state: 'ASSIGNED' });
    });

    it('requests the next free id from a value in a direction', async () => {
        mocks.fetchData.mockResolvedValueOnce({ id: 36 });

        const result = await client.nextFreeId({ from: 29, direction: 'up' });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: 'https://tenant.example/service/tenantadmin/id-allocation/next-free?direction=up&from=29',
            }),
        );
        expect(result).toEqual({ id: 36 });
    });

    it('requests the smallest free id when no start value is given', async () => {
        mocks.fetchData.mockResolvedValueOnce({ id: 21 });

        const result = await client.nextFreeId({ direction: 'up' });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: 'https://tenant.example/service/tenantadmin/id-allocation/next-free?direction=up',
            }),
        );
        expect(result).toEqual({ id: 21 });
    });

    it('reserves a specific id', async () => {
        mocks.fetchData.mockResolvedValueOnce({ json: async () => ({ id: 21 }) });

        const result = await client.reserveId({ allocationMode: 'MANUAL', id: 21 });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.POST,
                url: 'https://tenant.example/service/tenantadmin/id-allocation/reservations',
                bodyData: JSON.stringify({ allocationMode: 'MANUAL', id: 21 }),
            }),
        );
        expect(result).toEqual({ id: 21 });
    });

    it('maps a 409 reservation conflict onto IdReservationConflictError', async () => {
        mocks.fetchData.mockRejectedValueOnce(new Response(null, { status: 409 }));

        await expect(client.reserveId({ allocationMode: 'MANUAL', id: 30 })).rejects.toBeInstanceOf(
            IdReservationConflictError,
        );
    });

    it('releases a reservation', async () => {
        mocks.fetchData.mockResolvedValueOnce(new Response(null, { status: 204 }));

        await client.releaseId(21);

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.DELETE,
                url: 'https://tenant.example/service/tenantadmin/id-allocation/reservations/21',
            }),
        );
    });
});
