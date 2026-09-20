import { dpaInvitePreviewEndpoint, publicAccountInvitesEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

/** The complete mail document produced by UserService's canonical DPA dispatch path. */
export interface DpaMailPreview {
    subject: string;
    html: string;
}

const SILENT_PREVIEW_ERRORS = [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT];

/**
 * Public preview is scoped by the opaque onboarding invite token. It does not
 * mint a signing token and it does not send a message.
 */
export const getPublicDpaMailPreview = (inviteToken: string): Promise<DpaMailPreview> =>
    fetchData({
        url: `${publicAccountInvitesEndpoint}/${encodeURIComponent(inviteToken)}/onboarding/dpa-mail-preview`,
        method: FETCH_METHODS.GET,
        skipAuth: true,
        responseHandling: SILENT_PREVIEW_ERRORS,
    });

/**
 * Authenticated preview is scoped by the tenant selected by the admin. The
 * backend enforces tenant ownership (with platform-admin cross-tenant access).
 */
export const getAdminDpaMailPreview = (tenantId: number): Promise<DpaMailPreview> =>
    fetchData({
        url: dpaInvitePreviewEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [...SILENT_PREVIEW_ERRORS, FETCH_SUCCESS.CONTENT],
        bodyData: JSON.stringify({ tenantId }),
    });
