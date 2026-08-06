import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDataProtectionContent } from '../../types/dpp';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Reads a department's (Fachbereich = agency × topic) stored data privacy policy (content + status)
 * so the admin editor can be prefilled instead of overwriting on publish.
 */
export const getDepartmentDpp = (agencyId: number, topicId: number) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/dpp`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDataProtectionContent>;
