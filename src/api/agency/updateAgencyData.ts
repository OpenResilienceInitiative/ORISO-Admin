import { FETCH_ERRORS, FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';
import { withLegacyDioceseId } from '../legacyCaritasApiDefaults';
import { AgencyData } from '../../types/agency';
import updateAgencyType from './updateAgencyType';
import getConsultingType4Tenant from '../consultingtype/getConsultingType4Tenant';
import updateAgencyPostCodeRange from './updateAgencyPostCodeRange';
import { normalizeTopicIds } from './normalizeTopicIds';

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

    // ADR-003: topicIds may arrive as a single-select Option, a legacy Option[]/string[], or the
    // backend `topics` shape — normalise all of them to the string[] the API expects.
    const topicIds = normalizeTopicIds(formInput?.topicIds ?? formInput?.topics);

    const agencyDataRequestBody = withLegacyDioceseId({
        name: formInput.name,
        description: formInput.description,
        topicIds,
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
    });

    return fetchData({
        url: `${agencyEndpointBase}/${agencyModel.id}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_SUCCESS.CONTENT],
        bodyData: JSON.stringify(agencyDataRequestBody),
    }).then(async (response) => {
        await updateAgencyPostCodeRange(agencyId, formInput.postCodes, '');
        // eslint-disable-next-line no-underscore-dangle
        return response?._embedded;
    });
};
