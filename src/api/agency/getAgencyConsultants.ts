/* eslint-disable no-underscore-dangle -- HAL payload */
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { consultantsHasAgencyEndpoint } from '../../appConfig';
import { isActiveRecord } from '../../utils/deleteDate';

export interface AgencyConsultant {
    id: string;
    firstname?: string;
    lastname?: string;
    email?: string;
}

interface AgencyConsultantsResponse {
    total?: number;
    _embedded?: Array<{ _embedded?: AgencyConsultant & { deleteDate?: string | null } }>;
}

const fetchAgencyConsultants = (agencyId: string): Promise<AgencyConsultantsResponse> =>
    fetchData({
        url: consultantsHasAgencyEndpoint(agencyId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

/**
 * has agency consultants
 * @param agencyId - agency id
 * @return boolean
 */
export const hasAgencyConsultants = (agencyId: string) =>
    fetchAgencyConsultants(agencyId).then((data) => data.total > 0);

/** The counsellors currently assigned to the agency (GET /useradmin/agencies/{id}/consultants). */
export const getAgencyConsultants = (agencyId: string): Promise<AgencyConsultant[]> =>
    fetchAgencyConsultants(agencyId).then((data) =>
        (data?._embedded ?? [])
            .map((entry) => entry?._embedded)
            .filter((consultant) => consultant?.id && isActiveRecord(consultant))
            .map(({ id, firstname, lastname, email }) => ({ id, firstname, lastname, email })),
    );
