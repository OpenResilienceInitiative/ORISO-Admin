import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDataProtectionResponse } from '../../types/dpp';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Publishes (or draft-saves) a department's (Fachbereich = agency × topic) own data privacy policy.
 * Sends the multilingual language→HTML map plus the publish flag; the backend sanitises and stores
 * it and returns the resulting publication status.
 */
export const publishDepartmentDpp = (
    agencyId: number,
    topicId: number,
    contentByLanguage: Record<string, string>,
    publish: boolean,
) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/dpp`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({ content: contentByLanguage, publish }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDataProtectionResponse>;
