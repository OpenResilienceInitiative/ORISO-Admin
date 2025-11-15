import { consultantsForAgencyEventTypes } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve agency event type by id
 * @return {Promise}
 */
const getAgencyEventTypeById = (agencyId: string, eventTypeId: number) => {
    return fetchData({
        url: consultantsForAgencyEventTypes(agencyId, eventTypeId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default getAgencyEventTypeById;
