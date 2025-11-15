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
    const { firstname, lastname, email, username, twoFactorAuth, tenantId } = adminData;

    return (
        fetchData({
            url: agencyAdminEndpoint,
            method: FETCH_METHODS.POST,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
            bodyData: JSON.stringify({
                firstname,
                lastname,
                email,
                username: encodeUsername(username),
                twoFactorAuth,
                tenantId: parseInt(tenantId, 10),
            }),
        })
            .then((response) => {
                if (response.status === 200) {
                    return response.json();
                }
                return response.json();
            })
            // eslint-disable-next-line no-underscore-dangle
            .then((data: { _embedded: AdminData }) => data?._embedded)
            .then((data) => {
                return putAgenciesForAgencyAdmin(data?.id, adminData.agencies?.map(({ value }) => value) || []).then(
                    () => data,
                );
            })
    );
};
