import { accountInvitesEndpoint, appURL, inviteEmailTemplatesEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import type { AllocationMode } from '../idAllocation/idAllocation';

export type AccountInviteTargetRole =
    | 'TENANT_ADMIN'
    | 'AGENCY_ADMIN'
    | 'COUNSELLOR'
    | 'PLATFORM_ADMIN'
    | 'ADVICE_SEEKER';
export type AccountInviteStatus = 'DRAFT' | 'EMAIL_SENT' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED';
export type EmailVerificationStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'FAILED';
export type TwoFactorGateStatus = 'NOT_REQUIRED' | 'PENDING_SETUP' | 'ACTIVE' | 'WAIVED' | 'DISABLED_BY_POLICY';
export type AccessGateStatus = 'BLOCKED_INVITE' | 'BLOCKED_EMAIL' | 'BLOCKED_TWO_FACTOR' | 'READY';
export type InviteEmailDeliveryStatus = 'SENT' | 'FAILED';
export type InviteEmailTemplateKind = 'TENANT_INVITE' | 'COUNSELLOR_INVITE' | 'DPA_FORWARD';

export interface AccountInviteDTO {
    id: number;
    targetRole: AccountInviteTargetRole;
    tenantId: number | null;
    recipientEmail: string;
    firstName: string | null;
    lastName: string | null;
    agencyId: number | null;
    departmentId: number | null;
    provisioningStatus: string | null;
    inviteStatus: AccountInviteStatus;
    emailVerificationStatus: EmailVerificationStatus;
    emailDeliveryStatus: InviteEmailDeliveryStatus | null;
    twoFactorStatus: TwoFactorGateStatus;
    accessGateStatus: AccessGateStatus;
    expiresAt: string | null;
    acceptedAt: string | null;
    revokedAt: string | null;
    supersededAt: string | null;
    twoFactorWaivedBy: string | null;
    twoFactorWaivedAt: string | null;
    twoFactorWaiverReason: string | null;
    createDate: string;
    rawToken?: string;
    acceptUrl?: string;
}

export interface PagedAccountInviteResponse {
    content: AccountInviteDTO[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
}

export interface CreateAccountInviteRequest {
    targetRole: AccountInviteTargetRole;
    tenantId?: number;
    /**
     * ID allocation contract (#569/#570): `AUTO` = the backend assigns the
     * smallest free tenant id atomically and `tenantId` must be omitted;
     * `MANUAL` = `tenantId` is pinned and re-validated authoritatively (409 on
     * a collision). Omitted entirely on tabs without an allocation field.
     */
    tenantIdAllocationMode?: AllocationMode;
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    agencyId?: number;
    /** Same contract for the agency id space (AgencyService, U2). */
    agencyIdAllocationMode?: AllocationMode;
    departmentId?: number;
    expiresInDays?: number;
    templateId?: number;
    acceptBaseUrl?: string;
}

export interface SendAccountInviteRequest {
    templateId: number;
    acceptBaseUrl?: string;
}

export interface ListAccountInvitesParams {
    page?: number;
    size?: number;
    targetRole?: AccountInviteTargetRole;
    status?: AccountInviteStatus;
    tenantId?: number;
}

export interface InviteEmailTemplateDTO {
    id: number;
    kind: InviteEmailTemplateKind;
    name: string;
    language: string | null;
    subject: string;
    body: string;
    active: boolean;
    createDate: string;
    updateDate: string | null;
}

export interface TemplateRequestDTO {
    kind: InviteEmailTemplateKind;
    name: string;
    language?: string | null;
    subject: string;
    body: string;
    active: boolean;
}

export const accountInviteAcceptBaseUrl = `${appURL.replace(/\/$/, '')}/account-invite`;
export { accountInvitesEndpoint };

export const listAccountInvites = async (
    params: ListAccountInvitesParams = {},
): Promise<PagedAccountInviteResponse> => {
    const search = new URLSearchParams();
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 20));
    if (params.targetRole) search.set('target_role', params.targetRole);
    if (params.status) search.set('status', params.status);
    if (params.tenantId != null) search.set('tenant_id', String(params.tenantId));

    return fetchData({
        url: `${accountInvitesEndpoint}?${search.toString()}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export const createAccountInvite = async (body: CreateAccountInviteRequest): Promise<AccountInviteDTO> => {
    const response = await fetchData({
        url: accountInvitesEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        // CONFLICT_WITH_RESPONSE lets a 409 (e.g. a colliding tenantId) reject with the
        // raw Response instead of a swallowed generic toast, so callers can surface a
        // specific message (see AccountInvitesTab's onCreate).
        responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
        bodyData: JSON.stringify({
            acceptBaseUrl: body.acceptBaseUrl,
            agencyId: body.agencyId,
            agencyIdAllocationMode: body.agencyIdAllocationMode,
            departmentId: body.departmentId,
            expiresInDays: body.expiresInDays,
            firstName: body.firstName,
            lastName: body.lastName,
            recipientEmail: body.recipientEmail,
            targetRole: body.targetRole,
            templateId: body.templateId,
            tenantId: body.tenantId,
            tenantIdAllocationMode: body.tenantIdAllocationMode,
        }),
    });
    return response.json();
};

export const resendAccountInvite = async (
    inviteId: number,
    body: SendAccountInviteRequest,
): Promise<AccountInviteDTO> => {
    const response = await fetchData({
        url: `${accountInvitesEndpoint}/${inviteId}/resend`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify({
            acceptBaseUrl: body.acceptBaseUrl,
            templateId: body.templateId,
        }),
    });
    return response.json();
};

export const revokeAccountInvite = async (inviteId: number): Promise<AccountInviteDTO> => {
    const response = await fetchData({
        url: `${accountInvitesEndpoint}/${inviteId}/revoke`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    return response.json();
};

export const listInviteEmailTemplates = async (kind?: InviteEmailTemplateKind): Promise<InviteEmailTemplateDTO[]> =>
    fetchData({
        url: kind ? `${inviteEmailTemplatesEndpoint}?kind=${encodeURIComponent(kind)}` : inviteEmailTemplatesEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

export const createInviteEmailTemplate = async (body: TemplateRequestDTO): Promise<InviteEmailTemplateDTO> => {
    const response = await fetchData({
        url: inviteEmailTemplatesEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(body),
    });
    return response.json();
};

export const updateInviteEmailTemplate = async (
    id: number,
    body: TemplateRequestDTO,
): Promise<InviteEmailTemplateDTO> => {
    const response = await fetchData({
        url: `${inviteEmailTemplatesEndpoint}/${id}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(body),
    });
    return response.json();
};
