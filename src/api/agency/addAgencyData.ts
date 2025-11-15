import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';
import updateAgencyPostCodeRange from './updateAgencyPostCodeRange';
import getConsultingType4Tenant from '../consultingtype/getConsultingType4Tenant';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';

function buildAgencyDataRequestBody(
    consultingTypeResponseId: string | number,
    formData: Record<string, any>,
    tenantId: number,
) {
    const topics = formData?.topicIds || formData?.topics;
    const topicIds = topics
        ?.map((topic) => (typeof topic === 'string' ? topic : topic?.value || topic?.id))
        .filter((id) => id != null && !Number.isNaN(Number(id)));
    const requestBody: any = {
        // diocese in case of SAAS is not relevant object but enforced by API
        // dioceseId: formData.dioceseId ? parseInt(formData.dioceseId, 10) : 0,
        name: formData.name,
        description: formData.description ? formData.description : '',
        postcode: formData.postcode,
        city: formData.city,
        consultingType: consultingTypeResponseId,
        teamAgency: formData.teamAgency ? formData.teamAgency : false,
        // enforced by admin API, without business value for SAAS
        external: false,
        offline: formData.offline,
        dataProtection: formData.dataProtection || { agreement: true, agreementDate: new Date().toISOString() },
        tenantId,
        agencyLogo: formData.agencyLogo || '',
    };

    // Only include optional fields if they have values
    if (topicIds && topicIds.length > 0) {
        requestBody.topicIds = topicIds;
    }
    if (formData.demographics && Object.keys(formData.demographics).length > 0) {
        requestBody.demographics = formData.demographics;
    }
    if (formData.counsellingRelations && formData.counsellingRelations.length > 0) {
        requestBody.counsellingRelations = formData.counsellingRelations;
    }

    return JSON.stringify(requestBody);
}

async function createAgency(agencyDataRequestBody: string) {
    return fetchData({
        url: agencyEndpointBase,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: agencyDataRequestBody,
    }).then((addAgencyResponse) => {
        return addAgencyResponse.json();
    });
}

/**
 * add new agency
 * @param agencyData
 * @return data
 */
async function addAgencyData(agencyData: Record<string, any>) {
    // Get tenant ID from JWT token
    const { tenantId = 1 } = parseUserAuthInfo();

    const consultingTypeId =
        agencyData.consultingType !== null && agencyData.consultingType !== undefined
            ? parseInt(agencyData.consultingType, 10)
            : await getConsultingType4Tenant();

    const agencyDataRequestBody = buildAgencyDataRequestBody(consultingTypeId, agencyData, tenantId);
    const agencyCreationResponse = await createAgency(agencyDataRequestBody);
    // eslint-disable-next-line no-underscore-dangle
    const agencyResponseData = agencyCreationResponse._embedded;
    await updateAgencyPostCodeRange(agencyResponseData.id, agencyData.postCodes || [], 'POST');

    return agencyResponseData;
}

export default addAgencyData;
