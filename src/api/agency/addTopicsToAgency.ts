import getAgencyDataById from './getAgencyById';
import { updateAgencyData } from './updateAgencyData';
import { AgencyData } from '../../types/agency';

/**
 * Adds topics to a centre's offer. The agency PUT replaces the whole record, so it starts from
 * the stored agency, as the agency edit page does.
 */
export const addTopicsToAgency = async (agencyId: string, topicIds: string[]) => {
    // eslint-disable-next-line no-underscore-dangle
    const agency: AgencyData = (await getAgencyDataById(agencyId))._embedded;
    const current = (agency.topics ?? []).map(({ id }) => String(id));
    return updateAgencyData(agency, { ...agency, topicIds: [...new Set([...current, ...topicIds])] } as AgencyData);
};
