import { dpaInviteEmailEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export interface SendDpaInviteEmailRequest {
    tenantId: number;
    recipientEmail: string;
    signLink: string;
    expiresAt: string;
}

export const sendDpaInviteEmail = (body: SendDpaInviteEmailRequest) =>
    fetchData({
        url: dpaInviteEmailEndpoint,
        method: FETCH_METHODS.POST,
        bodyData: JSON.stringify(body),
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.CATCH_ALL_SILENT],
    });
