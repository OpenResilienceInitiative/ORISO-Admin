import { agencyServiceAdminEndpoint } from '../../appConfig';
import { AgencyAdminControls } from '../../types/AgencyAdminControls';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const updateAgencyAdminControls = (body: AgencyAdminControls) =>
    fetchData({
        url: `${agencyServiceAdminEndpoint}/controls`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(body),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<AgencyAdminControls>;
