import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';
import { AgencyData } from '../../types/agency';

/**
 * delete agency
 * @param agencyData
 * @return Promise
 */
const deleteAgencyData = (agencyData: AgencyData) => {
    const { id } = agencyData;

    return fetchData({
        url: `${agencyEndpointBase}/${id}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export default deleteAgencyData;
