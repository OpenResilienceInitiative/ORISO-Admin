import { dpaInviteEmailEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export interface SendDpaInviteEmailRequest {
    tenantId: number;
    recipientEmail: string;
    signLink: string;
    expiresAt: string;
}

/** The backend uses 502 specifically when the signing link exists but mail delivery failed. */
export const isDpaInviteEmailDeliveryFailure = (error: unknown): error is Response =>
    error instanceof Response && error.status === 502;

export const sendDpaInviteEmail = (body: SendDpaInviteEmailRequest) =>
    fetchData({
        url: dpaInviteEmailEndpoint,
        method: FETCH_METHODS.POST,
        bodyData: JSON.stringify(body),
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.BAD_REQUEST, FETCH_ERRORS.CATCH_ALL_SILENT],
    });
