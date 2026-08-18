import routePathNames, { accountInvitesEndpoint, appURL, inviteEmailTemplatesEndpoint } from '../../appConfig';
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

/**
 * Rendered branded invite mail (ORISO-UserService#914).
 *
 * `html` is a COMPLETE standalone document (doctype, head, inline styles) produced by the
 * backend's single canonical layout renderer — the very markup the dispatcher hands to SMTP.
 * Render it as-is inside an isolated frame; never re-style, rewrite or otherwise post-process it,
 * or the Admin re-introduces exactly the drift the issue removes.
 */
export interface InviteEmailPreviewDTO {
    templateId: number | null;
    templateName: string | null;
    kind: InviteEmailTemplateKind;
    language: string | null;
    subject: string;
    html: string;
    plainText: string;
    /** Always contains the literal token `SAMPLE-PREVIEW-TOKEN`, never a usable invite link. */
    sampleAcceptUrl: string;
}

export interface InviteEmailPreviewParams {
    /** Render a stored template (404 if unknown). */
    templateId?: number;
    /** Pick the sample content for a template kind (400 if unknown). */
    kind?: InviteEmailTemplateKind;
    /** Preview a specific tenant's branding; omit for platform branding. */
    tenantId?: number;
    /** Frame wording (`de` | `en`); the backend defaults to `de`. */
    language?: string;
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
/** Public Admin onboarding page — the accept target for tenant-admin invites (TEN-INV U8, #571). */
export const tenantAdminOnboardingAcceptBaseUrl = `${appURL.replace(/\/$/, '')}${routePathNames.tenantOnboarding}`;
/** Public Admin wizard — the accept target for counsellor invites (#997). */
export const counsellorOnboardingAcceptBaseUrl = `${appURL.replace(/\/$/, '')}${routePathNames.counsellorOnboarding}`;

/**
 * Accept base URL by invited role (TEN-INV U6/U8, #569/#571/UserService#890;
 * #997): the emailed link is `{acceptBaseUrl}/{rawToken}`. A tenant admin
 * completes the invite on the PUBLIC ADMIN onboarding route (the tenant is an
 * organisation, not an app user); a counsellor completes it on the PUBLIC
 * ADMIN wizard (#997 product decision — step-by-step in the Admin SPA); every
 * other role keeps the app-layer `/account-invite` route. NOTE: the backend
 * decides the real link server-side (TEN-INV-U6) — this mirror exists for the
 * UI's link previews and must stay in sync with InviteAcceptUrlBuilder.
 */
export const acceptBaseUrlForRole = (targetRole: AccountInviteTargetRole): string => {
    if (targetRole === 'TENANT_ADMIN') return tenantAdminOnboardingAcceptBaseUrl;
    if (targetRole === 'COUNSELLOR') return counsellorOnboardingAcceptBaseUrl;
    return accountInviteAcceptBaseUrl;
};
export { accountInvitesEndpoint };

const normalizeAllocatedId = (
    field: 'tenantId' | 'agencyId',
    mode: AllocationMode | undefined,
    id: number | undefined,
): number | undefined => {
    if (mode === 'AUTO') return undefined;
    if (mode === 'MANUAL' && id == null) {
        throw new TypeError(`${field} is required when allocation mode is MANUAL`);
    }
    return id;
};

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
    const tenantId = normalizeAllocatedId('tenantId', body.tenantIdAllocationMode, body.tenantId);
    const agencyId = normalizeAllocatedId('agencyId', body.agencyIdAllocationMode, body.agencyId);
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
            agencyId,
            agencyIdAllocationMode: body.agencyIdAllocationMode,
            departmentId: body.departmentId,
            expiresInDays: body.expiresInDays,
            firstName: body.firstName,
            lastName: body.lastName,
            recipientEmail: body.recipientEmail,
            targetRole: body.targetRole,
            templateId: body.templateId,
            tenantId,
            tenantIdAllocationMode: body.tenantIdAllocationMode,
        }),
    });
    return response.json();
};

/**
 * First delivery of a never-sent invite (`POST .../{id}/send`).
 *
 * Deliberately NOT `resendAccountInvite`: `/resend` supersedes the invite it is
 * given — the old row becomes `SUPERSEDED` ("Ersetzt") and a replacement id is
 * created. That is correct for an invite whose mail already went out and wrong
 * for a `DRAFT`, which has never been mailed at all. Callers dispatch by status.
 */
export const sendAccountInvite = async (
    inviteId: number,
    body: SendAccountInviteRequest,
): Promise<AccountInviteDTO> => {
    const response = await fetchData({
        url: `${accountInvitesEndpoint}/${inviteId}/send`,
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

export const inviteEmailPreviewEndpoint = `${inviteEmailTemplatesEndpoint}/preview`;

/**
 * Renders the branded invite mail exactly as the dispatcher would send it (UserService#914).
 *
 * Without parameters the backend renders its built-in sample invite with platform branding.
 * Failures reject silently (`CATCH_ALL_SILENT`) because the preview panel shows its own inline
 * error with a retry, rather than a global toast on a settings page.
 */
export const getInviteEmailPreview = async (params: InviteEmailPreviewParams = {}): Promise<InviteEmailPreviewDTO> => {
    const search = new URLSearchParams();
    if (params.templateId != null) search.set('templateId', String(params.templateId));
    if (params.kind) search.set('kind', params.kind);
    if (params.tenantId != null) search.set('tenant_id', String(params.tenantId));
    if (params.language) search.set('language', params.language);
    const query = search.toString();

    return fetchData({
        url: query ? `${inviteEmailPreviewEndpoint}?${query}` : inviteEmailPreviewEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
};

export interface InviteEmailPreviewContentParams extends InviteEmailPreviewParams {
    /** Unsaved subject from the editor. */
    subject?: string;
    /** Unsaved body from the editor. */
    body?: string;
}

/**
 * Live preview of UNSAVED editor content through the backend's own renderer
 * (`POST .../invite-email-templates/preview`).
 *
 * This is what keeps the composer honest: the endpoint runs the very
 * `renderBrandedMail` call the dispatcher runs, so an authored template can be
 * seen exactly as it will be sent — branding, layout, CTA and all — instead of
 * through an Admin-side re-implementation of the mail frame. `CATCH_ALL_SILENT`
 * because the preview panel shows its own inline error with a retry.
 */
export const previewInviteEmailTemplateContent = async (
    params: InviteEmailPreviewContentParams = {},
): Promise<InviteEmailPreviewDTO> =>
    fetchData({
        url: inviteEmailPreviewEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        bodyData: JSON.stringify({
            body: params.body,
            kind: params.kind,
            language: params.language,
            subject: params.subject,
            templateId: params.templateId,
            tenantId: params.tenantId,
        }),
    }).then((response) => response.json());

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
