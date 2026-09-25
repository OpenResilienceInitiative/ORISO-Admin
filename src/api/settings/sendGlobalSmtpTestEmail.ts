import { globalSmtpTestEmailEndpoint } from '../../appConfig';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';

export interface GlobalSmtpTestPayload {
    recipientEmail: string;
}

export const sendGlobalSmtpTestEmail = (payload: GlobalSmtpTestPayload) =>
    fetchData({
        url: globalSmtpTestEmailEndpoint,
        method: FETCH_METHODS.POST,
        bodyData: JSON.stringify(payload),
        responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE],
    });
