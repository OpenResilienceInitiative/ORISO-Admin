import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';
import { encodeUsername } from '../../utils/encryptionHelpers';
import { CounselorData } from '../../types/counselor';
import { putAgenciesForCounselor } from '../agency/putAgenciesForCounselor';

/**
 * add new counselor
 * @param counselorData
 * @return data
 */
export const addCounselorData = (counselorData: Record<string, any>): Promise<CounselorData> => {
    const {
        firstname,
        lastname,
        formalLanguage,
        email,
        absent,
        username,
        password,
        twoFactorAuth,
        isGroupchatConsultant,
        tenantId,
    } = counselorData;

    // just use needed data from whole form data
    const strippedCounselor = {
        firstname,
        lastname,
        formalLanguage: !!formalLanguage,
        email,
        absent: !!absent,
        username, // MATRIX MIGRATION: Don't encrypt username - backend handles it
        ...(password && { password }), // Include password if provided
        twoFactorAuth,
        isGroupchatConsultant,
        tenantId: parseInt(tenantId, 10),
    };

    return (
        fetchData({
            url: counselorEndpoint,
            method: FETCH_METHODS.POST,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CONFLICT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL],
            bodyData: JSON.stringify(strippedCounselor),
        })
            .then((response) => {
                if (response.status === 200) {
                    return response.json();
                }
                return response.json();
            })
            // eslint-disable-next-line no-underscore-dangle
            .then((data: { _embedded: CounselorData }) => data?._embedded)
            .then((data) => {
                return putAgenciesForCounselor(data?.id, counselorData.agencies?.map(({ value }) => value) || []).then(
                    () => data,
                );
            })
    );
};
