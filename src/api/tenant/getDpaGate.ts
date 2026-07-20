import { tenantAdminEndpoint } from '../../appConfig';
import { DpaGateStatus } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Returns whether the tenant has a published and signed DPA. */
export const getDpaGate = (tenantId: number) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/gate`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DpaGateStatus>;
