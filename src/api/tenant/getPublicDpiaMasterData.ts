import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { baseTenantPublicEndpoint } from '../../appConfig';
import type { DpiaMasterData } from '../../types/dpiaMasterData';

/** Public, read-only endpoint intentionally has no Authorization header. */
export const getPublicDpiaMasterData = () =>
    fetchData({
        url: `${baseTenantPublicEndpoint}/dpia`,
        method: FETCH_METHODS.GET,
        skipAuth: true,
        responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<DpiaMasterData | null>;
