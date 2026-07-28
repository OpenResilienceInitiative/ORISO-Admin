import { agencyIdAllocationEndpoint, tenantIdAllocationEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export { agencyIdAllocationEndpoint, tenantIdAllocationEndpoint };

/**
 * Shared tenant/agency ID allocation contract (TEN-INV, ORISO-Admin#569).
 *
 * The backend counterparts are built in parallel (TenantService U1 /
 * AgencyService U2); this module pins the agreed request/response shapes so
 * the composer can already be exercised against stubbed responses. The final
 * endpoint wiring is verified in the later wiring chunks (U3/U6).
 */

/** FREE = assignable · RESERVED = held by an open invite · ASSIGNED = consumed by a real entity. */
export type IdAllocationState = 'FREE' | 'RESERVED' | 'ASSIGNED';

export type AllocationMode = 'AUTO' | 'MANUAL';

export type NextFreeIdDirection = 'up' | 'down';

export interface IdAvailabilityDTO {
    id: number;
    state: IdAllocationState;
}

export interface NextFreeIdParams {
    /** Anchor value to navigate from; omitted = "smallest free id" (the AUTO candidate). */
    from?: number;
    direction: NextFreeIdDirection;
}

export interface NextFreeIdDTO {
    /** `null` when no free id exists in the requested direction. */
    id: number | null;
}

export interface ReserveIdRequest {
    allocationMode: AllocationMode;
    /** Required in MANUAL mode; must be omitted in AUTO mode (the backend picks the smallest free id). */
    id?: number;
}

export interface ReservedIdDTO {
    id: number;
}

/** A reservation attempt lost the race: the id is already assigned or reserved (HTTP 409). */
export class IdReservationConflictError extends Error {
    constructor() {
        super(FETCH_ERRORS.CONFLICT);
        Object.setPrototypeOf(this, IdReservationConflictError.prototype);
    }
}

export interface IdAllocationClient {
    /** Authoritative state of one id — drives the manual-mode validation states. */
    checkIdAvailability(id: number): Promise<IdAvailabilityDTO>;
    /** Next free id from `from` in `direction`, skipping RESERVED and ASSIGNED ids. */
    nextFreeId(params: NextFreeIdParams): Promise<NextFreeIdDTO>;
    /** Reserve a specific id (MANUAL) or the smallest free one (AUTO); rejects with {@link IdReservationConflictError} on a lost race. */
    reserveId(request: ReserveIdRequest): Promise<ReservedIdDTO>;
    /** Release an unconsumed reservation so the id becomes assignable again. */
    releaseId(id: number): Promise<void>;
}

/**
 * The availability/next-free lookups reject silently (no global error toast):
 * they run on every debounced keystroke and the field renders its own inline
 * "service error" state instead.
 */
export const createIdAllocationClient = (endpointBase: string): IdAllocationClient => ({
    checkIdAvailability: (id) =>
        fetchData({
            url: `${endpointBase}/${id}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        }),

    nextFreeId: ({ from, direction }) => {
        const search = new URLSearchParams();
        search.set('direction', direction);
        if (from != null) search.set('from', String(from));

        return fetchData({
            url: `${endpointBase}/next-free?${search.toString()}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        });
    },

    reserveId: async (request) => {
        let response;
        try {
            response = await fetchData({
                url: `${endpointBase}/reservations`,
                method: FETCH_METHODS.POST,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
                bodyData: JSON.stringify({
                    allocationMode: request.allocationMode,
                    id: request.id,
                }),
            });
        } catch (error) {
            if (error instanceof Response && error.status === 409) {
                throw new IdReservationConflictError();
            }
            throw error;
        }
        return response.json();
    },

    releaseId: async (id) => {
        await fetchData({
            url: `${endpointBase}/reservations/${id}`,
            method: FETCH_METHODS.DELETE,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        });
    },
});

/** Tenant-ID space — owned by TenantService (U1). */
export const tenantIdAllocationClient = createIdAllocationClient(tenantIdAllocationEndpoint);

/** Agency-ID space — owned by AgencyService (U2); tenant ids are never reserved here. */
export const agencyIdAllocationClient = createIdAllocationClient(agencyIdAllocationEndpoint);
