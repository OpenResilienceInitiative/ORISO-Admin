import { consultantsForAgencyEventTypesNew } from '../../appConfig';
import { AgencyEventTypeUpdate } from '../../types/agencyEdit';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * retrieve all needed agency event type data
 * @return {Promise}
 */
const postConsultantForAgencyEventTypes = (agencyId: string, bodyData: AgencyEventTypeUpdate) => {
    return fetchData({
        url: consultantsForAgencyEventTypesNew(agencyId),
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(bodyData),
    }).then((addEventTypeResponse) => {
        return addEventTypeResponse.json();
    });
};

export default postConsultantForAgencyEventTypes;
