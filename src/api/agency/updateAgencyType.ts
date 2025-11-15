import { AgencyData } from '../../types/agency';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';

export default async function updateAgencyType(agencyModel: AgencyData, formInput: AgencyData) {
    if (agencyModel.teamAgency === formInput.teamAgency) {
        return Promise.resolve();
    }

    let agencyTypeChangeRequestBody = null;

    if (formInput.teamAgency === true) {
        agencyTypeChangeRequestBody = { agencyType: 'TEAM_AGENCY' };
    } else {
        agencyTypeChangeRequestBody = { agencyType: 'DEFAULT_AGENCY' };
    }

    return fetchData({
        url: `${agencyEndpointBase}/${agencyModel.id}/changetype`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(agencyTypeChangeRequestBody),
    });
}
