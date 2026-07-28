import { FETCH_ERRORS, FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';
import { withLegacyDioceseId } from '../legacyCaritasApiDefaults';
import { AgencyData } from '../../types/agency';
import updateAgencyType from './updateAgencyType';
import getConsultingType4Tenant from '../consultingtype/getConsultingType4Tenant';
import updateAgencyPostCodeRange from './updateAgencyPostCodeRange';
import { normalizeTopicIds } from './normalizeTopicIds';
import { stripAgencyAdminControls } from './stripAgencyAdminControls';

/**
 * update agency
 * @param agencyModel - agency data from backend
 * @param formInput - input data from form
 * @return data
 */
export const updateAgencyData = async (agencyModel: AgencyData, formInput: AgencyData) => {
    const agencyId = agencyModel.id;
    if (agencyId == null) {
        throw Error('agency id must be set');
    }

    await updateAgencyType(agencyModel, formInput);

    const consultingTypeId =
        formInput.consultingType !== null ? parseInt(formInput.consultingType, 10) : await getConsultingType4Tenant();

    // ADR-014: topicIds may arrive as a multi-select Option[], a lone Option, a string[], or the
    // backend `topics` shape — normalise all of them to the string[] the API expects.
    //
    // Absent is NOT the same as empty. The picker only renders once the topic list loaded
    // (`topics?.length > 0 &&` in AgencySettings), and narrow card patches carry no topic data at
    // all. Sending [] in those cases tells the backend to clear every department — which deletes
    // the agency_topic rows and, with them, each department's published Impressum and
    // Datenschutzerklärung. Omitting the key makes AgencyTopicMergeService keep the existing links.
    const hasTopicField = formInput?.topicIds !== undefined || formInput?.topics !== undefined;
    const topicIds = hasTopicField ? normalizeTopicIds(formInput.topicIds ?? formInput.topics) : undefined;

    const agencyDataRequestBody = withLegacyDioceseId({
        name: formInput.name,
        description: formInput.description,
        ...(hasTopicField ? { topicIds } : {}),
        postcode: formInput.postcode,
        city: formInput.city,
        street: formInput.street,
        houseNumber: formInput.houseNumber,
        floorBuilding: formInput.floorBuilding,
        country: formInput.country,
        phone: formInput.phone,
        phoneSecondary: formInput.phoneSecondary,
        email: formInput.email,
        consultingType: consultingTypeId,
        teamAgency: formInput.teamAgency,
        offline: !formInput.online, // Convert from 'online' form field to 'offline' API field
        external: false,
        demographics: formInput.demographics,
        counsellingRelations: formInput.counsellingRelations,
        dataProtection: formInput.dataProtection,
        content: formInput.content,
        agencyLogo: formInput.agencyLogo,
        // Omitting `settings` keeps the stored value backend-side; the injected platform
        // controls must never be echoed back (super-admin-only update path).
        ...(formInput.settings ? { settings: stripAgencyAdminControls(formInput.settings) } : {}),
    });

    return fetchData({
        url: `${agencyEndpointBase}/${agencyModel.id}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_SUCCESS.CONTENT],
        bodyData: JSON.stringify(agencyDataRequestBody),
    }).then(async (response) => {
        // Card-based agency edits submit narrow patches. The regular agency GET
        // does not contain postcode ranges, so treating an absent `postCodes`
        // field as an empty selection silently replaces the stored range with
        // 00000-99999. Only the registration card may mutate postcode ranges.
        if (formInput.postCodes !== undefined) {
            await updateAgencyPostCodeRange(agencyId, formInput.postCodes, '');
        }
        // eslint-disable-next-line no-underscore-dangle
        return response?._embedded;
    });
};
