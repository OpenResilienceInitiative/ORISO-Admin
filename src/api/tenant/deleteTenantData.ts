import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { tenantEndpoint } from '../../appConfig';
import { toTenantDeletionError } from './tenantDeletionBlockers';

/**
 * Deletes a Träger. TenantService refuses with 409 while the Träger still has agencies, accounts
 * or open invitations, and with 503 when it cannot check that (ORISO-UserService#1466); both are
 * rejected as typed errors so the caller can say what has to happen first.
 */
export const deleteTenantData = (id: number) =>
    fetchData({
        url: `${tenantEndpoint}${id}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.NOT_ALLOWED,
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.SERVICE_UNAVAILABLE,
        ],
    }).catch(async (failure: unknown) => {
        throw await toTenantDeletionError(failure);
    });
