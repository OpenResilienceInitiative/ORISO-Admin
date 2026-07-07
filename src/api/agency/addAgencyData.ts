import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';
import { withLegacyDioceseId } from '../legacyCaritasApiDefaults';
import updateAgencyPostCodeRange from './updateAgencyPostCodeRange';
import getConsultingType4Tenant from '../consultingtype/getConsultingType4Tenant';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { assignAgencyToConsultants } from './assignAgencyToConsultants';
import { normalizeTopicIds } from './normalizeTopicIds';

function buildAgencyDataRequestBody(
    consultingTypeResponseId: string | number,
    formData: Record<string, any>,
    tenantId: number,
) {
    // ADR-003: single-select topic picker — normalise the Option/array/id shapes to string[].
    const topicIds = normalizeTopicIds(formData?.topicIds ?? formData?.topics);
    const requestBody: any = withLegacyDioceseId({
        name: formData.name,
        description: formData.description ? formData.description : '',
        postcode: formData.postcode,
        city: formData.city,
        street: formData.street,
        houseNumber: formData.houseNumber,
        floorBuilding: formData.floorBuilding,
        country: formData.country,
        phone: formData.phone,
        phoneSecondary: formData.phoneSecondary,
        email: formData.email,
        consultingType: consultingTypeResponseId,
        teamAgency: formData.teamAgency ? formData.teamAgency : false,
        // enforced by admin API, without business value for SAAS
        external: false,
        offline: formData.offline,
        dataProtection: formData.dataProtection || { agreement: true, agreementDate: new Date().toISOString() },
        tenantId,
        agencyLogo: formData.agencyLogo || '',
    });

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

export function resolveAgencyTenantId(selectedTenantIdValue: unknown, tokenTenantIdValue: unknown): number | undefined {
    const selectedTenantId = Number(selectedTenantIdValue);

    if (Number.isFinite(selectedTenantId) && selectedTenantId > 0) {
        return selectedTenantId;
    }

    const tokenTenantId = Number(tokenTenantIdValue);

    if (Number.isFinite(tokenTenantId) && tokenTenantId > 0) {
        return tokenTenantId;
    }

    return undefined;
}

/**
 * add new agency
 * @param agencyData
 * @return data
 */
async function addAgencyData(agencyData: Record<string, any>) {
    // Prefer explicitly selected tenant from form (superadmin flow).
    // Fallback to JWT tenant for tenant-admin users.
    const { tenantId: tokenTenantId } = parseUserAuthInfo();
    const tenantId = resolveAgencyTenantId(agencyData?.tenantId, tokenTenantId);

    if (!tenantId) {
        throw new Error('A valid tenantId is required to create an agency.');
    }

    const consultingTypeId =
        agencyData.consultingType !== null && agencyData.consultingType !== undefined
            ? parseInt(agencyData.consultingType, 10)
            : await getConsultingType4Tenant();

    const agencyDataRequestBody = buildAgencyDataRequestBody(consultingTypeId, agencyData, tenantId);
    const agencyCreationResponse = await createAgency(agencyDataRequestBody);
    // eslint-disable-next-line no-underscore-dangle
    const agencyResponseData = agencyCreationResponse._embedded;
    await updateAgencyPostCodeRange(agencyResponseData.id, agencyData.postCodes || [], 'POST');

    if (agencyData.consultantIds?.length > 0) {
        try {
            await assignAgencyToConsultants(agencyResponseData.id, agencyData.consultantIds);
        } catch {
            return {
                ...agencyResponseData,
                consultantAssignmentFailed: true,
            };
        }
    }

    return agencyResponseData;
}

export default addAgencyData;
