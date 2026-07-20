import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDataProtectionResponse } from '../../types/dpp';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Publishes or draft-saves the legal notice for one agency × topic department. */
export const publishDepartmentImprint = (
    agencyId: number,
    topicId: number,
    contentByLanguage: Record<string, string>,
    publish: boolean,
) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/imprint`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({ content: contentByLanguage, publish }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDataProtectionResponse>;
