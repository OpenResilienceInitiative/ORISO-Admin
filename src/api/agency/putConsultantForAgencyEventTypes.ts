import { consultantsForAgencyEventTypes } from '../../appConfig';
import { AgencyEventTypeUpdate } from '../../types/agencyEdit';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all needed agency event type data
 * @return {Promise}
 */
const putConsultantForAgencyEventTypes = (agencyId: string, eventTypeId: number, bodyData: AgencyEventTypeUpdate) => {
    return fetchData({
        url: consultantsForAgencyEventTypes(agencyId, eventTypeId),
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(bodyData),
    });
};

export default putConsultantForAgencyEventTypes;
