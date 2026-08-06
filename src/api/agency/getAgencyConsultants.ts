import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { consultantsHasAgencyEndpoint } from '../../appConfig';

/**
 * has agency consultants
 * @param agencyId - agency id
 * @return boolean
 */
export const hasAgencyConsultants = (agencyId: string) => {
    return fetchData({
        url: consultantsHasAgencyEndpoint(agencyId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }).then((data) => {
        return data.total > 0;
    });
};
