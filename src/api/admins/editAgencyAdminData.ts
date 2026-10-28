import { LabeledValue } from 'antd/lib/select';
import {
    AccountOperationIntent,
    accountOperationHeaders,
    acknowledgeAccountOperation,
    settleAccountOperation,
    settleAccountOperationStep,
} from '../../utils/accountOperationIntent';
import { CounselorData } from '../../types/counselor';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyAdminEndpoint } from '../../appConfig';
import { AdminData } from '../../types/admin';
import { putAgenciesForAgencyAdmin } from '../agency/putAgenciesForAdmin';

/**
 * edit admin
 * @param formData - input data from form
 * @return data
 */
const performEditAgencyAdminData = async (
    id: string,
    formData: AdminData,
    operationIntent?: AccountOperationIntent,
): Promise<AdminData> => {
    const { firstname, lastname, email, username, twoFactorAuth } = formData;

    const ids = ((formData.agencies as LabeledValue[])?.map(({ value }) => value) || []) as string[];
    const agencyIntent = operationIntent?.subIntent('agencies');
    await settleAccountOperationStep(operationIntent, agencyIntent, putAgenciesForAgencyAdmin(id, ids, agencyIntent));

    const url = `${agencyAdminEndpoint}/${id}`;
    const bodyData = JSON.stringify({
        firstname,
        lastname,
        email,
        username, // MATRIX MIGRATION: backend handles encoding
        twoFactorAuth,
    });
    return (
        fetchData({
            url,
            headersData: accountOperationHeaders(
                operationIntent?.subIntent('profile'),
                FETCH_METHODS.PUT,
                url,
                bodyData,
            ),
            method: FETCH_METHODS.PUT,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
            bodyData,
        })
            .then((response) => response.json())
            // eslint-disable-next-line no-underscore-dangle
            .then((data: { _embedded: CounselorData }) => data?._embedded)
            .then((data) => {
                acknowledgeAccountOperation(operationIntent);
                return data;
            })
    );
};

export const editAgencyAdminData = (
    id: string,
    formData: AdminData,
    operationIntent?: AccountOperationIntent,
): Promise<AdminData> =>
    settleAccountOperation(operationIntent, performEditAgencyAdminData(id, formData, operationIntent));
