import { FETCH_ERRORS, FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';
import { AgencyData } from '../../types/agency';
import updateAgencyType from './updateAgencyType';
import getConsultingType4Tenant from '../consultingtype/getConsultingType4Tenant';
import updateAgencyPostCodeRange from './updateAgencyPostCodeRange';

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

    const topics = formInput?.topicIds || formInput?.topics;

    const topicIds = topics
        ?.map((topic) => (typeof topic === 'string' ? topic : topic?.id))
        .filter((id) => !Number.isNaN(Number(id)));

    const agencyDataRequestBody = {
        dioceseId: formInput.dioceseId ? parseInt(formInput.dioceseId, 10) : 0,
        name: formInput.name,
        description: formInput.description,
        topicIds,
        postcode: formInput.postcode,
        city: formInput.city,
        consultingType: consultingTypeId,
        teamAgency: formInput.teamAgency,
        offline: !formInput.online, // Convert from 'online' form field to 'offline' API field
        external: false,
        demographics: formInput.demographics,
        counsellingRelations: formInput.counsellingRelations,
        dataProtection: formInput.dataProtection,
        agencyLogo: formInput.agencyLogo,
    };

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
