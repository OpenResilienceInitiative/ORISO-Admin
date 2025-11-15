import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyAdminEndpoint } from '../../appConfig';

/**
 * delete admin
 * @param id
 * @return data
 */
export const deleteAgencyAdminData = (id: string) => {
    return fetchData({
        url: `${agencyAdminEndpoint}/${id}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};
