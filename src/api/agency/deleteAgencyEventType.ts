import { consultantsForAgencyEventTypes } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * delete agency event type data
 * @return {Promise}
 */
const deleteAgencyEventType = (agencyId: string, eventTypeId: number) => {
    return fetchData({
        url: consultantsForAgencyEventTypes(agencyId, eventTypeId),
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default deleteAgencyEventType;
