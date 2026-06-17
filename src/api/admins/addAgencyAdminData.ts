import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyAdminEndpoint } from '../../appConfig';
import { encodeUsername } from '../../utils/encryptionHelpers';
import { AdminData } from '../../types/admin';
import { putAgenciesForAgencyAdmin } from '../agency/putAgenciesForAdmin';

/**
 * add new admin
 * @param adminData
 * @return data
 */
export const addAgencyAdminData = (adminData: Record<string, any>): Promise<AdminData> => {
    const { firstname, lastname, email, username, twoFactorAuth, tenantId, password } = adminData;
    const parseSuccessfulResponse = async (response: unknown) => {
        if (!(response instanceof Response)) {
            return response;
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        // The backend returns HAL responses (application/hal+json), so match any JSON content type
        // rather than the exact "application/json".
        if (!contentType.includes('json')) {
            return null;
        }

        const rawBody = await response.clone().text();
        if (!rawBody.trim()) {
            return null;
        }

        return JSON.parse(rawBody);
    };

    return (
        fetchData({
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
                username: encodeUsername(username),
                twoFactorAuth,
                tenantId: parseInt(tenantId, 10),
                ...(password ? { password } : {}),
            }),
        })
            .then(parseSuccessfulResponse)
            .then((data: AdminData | { _embedded: AdminData } | null) => {
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
                return putAgenciesForAgencyAdmin(
                    embeddedData.id,
                    adminData.agencies?.map(({ value }) => value) || [],
                )
                    .then(() => embeddedData)
                    .catch(() => ({ ...embeddedData, agencyAssignmentFailed: true }));
            })
    );
};
