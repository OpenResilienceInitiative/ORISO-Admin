import { mainURL } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

const invitelinksEndpoint = `${mainURL}/service/useradmin/invitelinks`;

export interface AgencyInviteLinkDTO {
    id: number;
    token: string;
    tenantId: number;
    agencyId: number;
    consultingTypeId: number | null;
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

export const listInviteLinks = async (): Promise<AgencyInviteLinkDTO[]> => {
    // fetchData already calls .json() on GET responses.
    return fetchData({
        url: invitelinksEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
};

export const createInviteLink = async (body: CreateInviteLinkRequest): Promise<AgencyInviteLinkDTO> => {
    // POST with responseHandling.CATCH_ALL returns the raw Response — we need .json() here.
    const response = await fetchData({
        url: invitelinksEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(body),
    });
    return response.json();
};
