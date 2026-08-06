import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyAdminEndpoint } from '../../appConfig';
import { AdminData } from '../../types/admin';
import { putAgenciesForAgencyAdmin } from '../agency/putAgenciesForAdmin';
import { parseHalResponse } from '../../utils/parseHalResponse';

/**
 * add new admin
 * @param adminData
 * @return data
 */
export const addAgencyAdminData = (adminData: Record<string, any>): Promise<AdminData> => {
    const { firstname, lastname, email, username, twoFactorAuth, tenantId, password } = adminData;

    return fetchData({
        url: agencyAdminEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
            FETCH_ERRORS.CATCH_ALL,
        ],
        bodyData: JSON.stringify({
            firstname,
            lastname,
            email,
            username, // MATRIX MIGRATION: backend handles encoding
            twoFactorAuth,
            tenantId: parseInt(tenantId, 10),
            ...(password ? { password } : {}),
        }),
    })
        .then(parseHalResponse)
        .then((data: unknown) => {
            let embeddedData: AdminData | null = data as AdminData | null;
            if (data && typeof data === 'object' && '_embedded' in data) {
                // eslint-disable-next-line no-underscore-dangle
                embeddedData = (data as { _embedded: AdminData })._embedded;
            }

            if (!embeddedData?.id) {
                throw new Error('Agency admin created but response did not include id');
            }

            // The account is already created at this point. Assigning agencies is a secondary
            // step, so a failure here must not turn the whole creation into an error. Instead we
            // flag it so the UI can show a non-blocking warning.
            return putAgenciesForAgencyAdmin(embeddedData.id, adminData.agencies?.map(({ value }) => value) || [])
                .then(() => embeddedData)
                .catch(() => ({ ...embeddedData, agencyAssignmentFailed: true }));
        });
};
