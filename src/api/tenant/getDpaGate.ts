import { tenantAdminEndpoint } from '../../appConfig';
import { DpaGateStatus } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/** Read server policy facts; an unavailable gate must not redirect a legal-text reader. */
export const getDpaGate = (tenantId: number) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/gate`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<DpaGateStatus>;
