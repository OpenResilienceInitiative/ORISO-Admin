import { agencyServiceAdminEndpoint } from '../../appConfig';
import { AgencyAdminControls } from '../../types/AgencyAdminControls';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export const getAgencyAdminControls = () =>
    fetchData({
        url: `${agencyServiceAdminEndpoint}/controls`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<AgencyAdminControls>;
