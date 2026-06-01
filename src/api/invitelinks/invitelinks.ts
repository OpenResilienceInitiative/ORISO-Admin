import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import {
    buildListQueryString,
    invitelinksEndpoint,
    inviteLinkHeaders,
    normalizeListResponse,
    PagedInviteLinksResponse,
} from './inviteLinkApiShared';

export interface AgencyInviteLinkDTO {
    id: number;
    token: string;
    tenantId: number;
    agencyId?: number | null;
    consultingTypeId?: number | null;
    topicId?: number | null;
    linkKind?: string | null;
    chatType?: string | null;
    anonymity?: string | null;
    createdByUserId: string;
    createdByUsername: string | null;
    createDate: string;
    expiresAt: string | null;
    usedAt: string | null;
    usedBySessionId: number | null;
    status: 'ACTIVE' | 'USED' | 'EXPIRED';
}

export interface CreateInviteLinkRequest {
    agencyId: number;
    expiresInDays?: number;
}

export interface ListAgencyInviteLinksParams {
    page?: number;
    size?: number;
    tenantId?: number;
}

/** invite-link-apis.json #5 — GET ?page=0&size=20 + Authorization + X-Tenant-Id */
export const listInviteLinks = async (
    params: ListAgencyInviteLinksParams = {},
): Promise<PagedInviteLinksResponse<AgencyInviteLinkDTO>> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const raw = await fetchData({
        url: `${invitelinksEndpoint}?${buildListQueryString(page, size)}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        headersData: inviteLinkHeaders(params.tenantId),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

    return normalizeListResponse<AgencyInviteLinkDTO>(raw, page, size);
};

/** invite-link-apis.json #3 — POST { agencyId, expiresInDays } + Authorization + X-Tenant-Id */
export const createInviteLink = async (
    body: CreateInviteLinkRequest,
    tenantId?: number,
): Promise<AgencyInviteLinkDTO> => {
    const payload: Record<string, unknown> = {
        agencyId: body.agencyId,
    };
    if (body.expiresInDays != null) {
        payload.expiresInDays = body.expiresInDays;
    }

    const response = await fetchData({
        url: invitelinksEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        headersData: inviteLinkHeaders(tenantId),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(payload),
    });
    return response.json();
};
