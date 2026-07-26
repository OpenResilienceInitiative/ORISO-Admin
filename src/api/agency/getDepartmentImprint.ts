import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDataProtectionContent } from '../../types/dpp';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Reads the stored legal notice for one agency × topic department. */
export const getDepartmentImprint = (agencyId: number, topicId: number) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/imprint`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDataProtectionContent>;
