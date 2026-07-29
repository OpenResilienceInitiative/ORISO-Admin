import { agencyIdNextFreeEndpoint, idAllocationValidationEndpoint, tenantIdNextFreeEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export { agencyIdNextFreeEndpoint, idAllocationValidationEndpoint, tenantIdNextFreeEndpoint };

/**
 * Tenant/agency ID allocation client (TEN-INV, ORISO-Admin#569), wired to the
 * REAL backend contracts:
 *
 *  - Live validation: UserService's aggregated endpoint (TEN-INV-U3, US#889)
 *    `GET /useradmin/id-allocation?tenantId=&agencyId=` — each entry answers
 *    `FREE` / `RESERVED` / `ASSIGNED`, or `SERVICE_ERROR` when the owning
 *    service could not be reached (surfaced here as a rejection so the field
 *    renders its inline service-error state).
 *  - Next-free stepping: the owning services directly —
 *    TenantService `GET /tenantadmin/tenant-ids/next-free?from=&direction=`
 *    (U1) and AgencyService `GET /agencyadmin/agencyids/next-free?fromId=&direction=`
 *    (U2). Both answer 404 when no free ID exists in the direction, which maps
 *    to `{ id: null }` (the composer disables the arrow).
 *
 * Reservation is NOT a client concern: it happens server-side during invite
 * creation (UserService U3 reserves via the owning services when the composer
 * sends `tenantIdAllocationMode` / `agencyIdAllocationMode` on
 * `POST /useradmin/account-invites`). The validation here is advisory for the
 * UI only — a stale green state never produces a duplicate ID.
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

/** The aggregated validation could not resolve the id (entry SERVICE_ERROR or missing). */
export class IdAllocationServiceError extends Error {
    /** Upstream HTTP status passed through by the aggregation, when known. */
    readonly upstreamStatus?: number;

    constructor(upstreamStatus?: number) {
        super('ID_ALLOCATION_SERVICE_ERROR');
        this.upstreamStatus = upstreamStatus;
        Object.setPrototypeOf(this, IdAllocationServiceError.prototype);
    }
}

export interface IdAllocationClient {
    /** Authoritative state of one id — drives the manual-mode validation states. */
    checkIdAvailability(id: number): Promise<IdAvailabilityDTO>;
    /** Next free id from `from` in `direction`, skipping RESERVED and ASSIGNED ids. */
    nextFreeId(params: NextFreeIdParams): Promise<NextFreeIdDTO>;
}

/** One entry of the aggregated U3 validation response. */
interface IdAllocationEntryDTO {
    id: number;
    status: IdAllocationState | 'SERVICE_ERROR';
    upstreamStatus?: number;
}

interface IdAllocationValidationResponseDTO {
    tenant?: IdAllocationEntryDTO;
    agency?: IdAllocationEntryDTO;
}

/**
 * The availability/next-free lookups reject silently (no global error toast):
 * they run on every debounced keystroke and the field renders its own inline
 * "service error" state instead.
 */
const checkIdAvailabilityVia =
    (queryParam: 'tenantId' | 'agencyId', entryKey: 'tenant' | 'agency') =>
    async (id: number): Promise<IdAvailabilityDTO> => {
        const response: IdAllocationValidationResponseDTO = await fetchData({
            url: `${idAllocationValidationEndpoint}?${queryParam}=${encodeURIComponent(id)}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        });

        const entry = response?.[entryKey];
        if (!entry || entry.status === 'SERVICE_ERROR') {
            throw new IdAllocationServiceError(entry?.upstreamStatus);
        }
        return { id: entry.id, state: entry.status };
    };

interface NextFreeEndpointShape {
    url: string;
    /** Query parameter name for the anchor value (`from` tenant / `fromId` agency). */
    fromParam: string;
    /** Response field carrying the found id (`id` tenant / `agencyId` agency). */
    idField: string;
}

/**
 * Both next-free endpoints require an anchor: `from` is EXCLUSIVE, so anchor 0
 * yields the smallest free id — exactly the AUTO candidate the composer adopts
 * on the first arrow interaction. 404 = no free id in that direction.
 */
const nextFreeIdVia =
    ({ url, fromParam, idField }: NextFreeEndpointShape) =>
    async ({ from, direction }: NextFreeIdParams): Promise<NextFreeIdDTO> => {
        const search = new URLSearchParams();
        search.set(fromParam, String(from ?? 0));
        search.set('direction', direction === 'up' ? 'UP' : 'DOWN');

        let response: Record<string, number | null>;
        try {
            response = await fetchData({
                url: `${url}?${search.toString()}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
            });
        } catch (error) {
            if (error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH) {
                return { id: null };
            }
            throw error;
        }
        return { id: response?.[idField] ?? null };
    };

/** Tenant-ID space — validation via UserService U3, stepping via TenantService U1. */
export const tenantIdAllocationClient: IdAllocationClient = {
    checkIdAvailability: checkIdAvailabilityVia('tenantId', 'tenant'),
    nextFreeId: nextFreeIdVia({ url: tenantIdNextFreeEndpoint, fromParam: 'from', idField: 'id' }),
};

/** Agency-ID space — validation via UserService U3, stepping via AgencyService U2. */
export const agencyIdAllocationClient: IdAllocationClient = {
    checkIdAvailability: checkIdAvailabilityVia('agencyId', 'agency'),
    nextFreeId: nextFreeIdVia({ url: agencyIdNextFreeEndpoint, fromParam: 'fromId', idField: 'agencyId' }),
};
