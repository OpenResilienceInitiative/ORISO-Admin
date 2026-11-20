import { appURL } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { withUtcInstants } from '../../utils/backendInstant';
import {
    buildListQueryString,
    invitelinksEndpoint,
    inviteLinkHeaders,
    normalizeListResponse,
    PagedInviteLinksResponse,
} from './inviteLinkApiShared';

export type TopicInviteLinkKind = 'TENANT' | 'COUNSELLOR' | 'EXTERNAL_INBOUND';
export type TopicInviteLinkChatType = 'LIVE_CHAT';
export type TopicInviteLinkAnonymity = 'FULL';
export type TopicInviteLinkStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'DISABLED';

export interface TopicInviteLinkDTO {
    id: number;
    token: string;
    tenantId: number;
    topicId: number;
    topicName?: string | null;
    linkKind: TopicInviteLinkKind;
    chatType: TopicInviteLinkChatType;
    anonymity: TopicInviteLinkAnonymity;
    consultantId: string | null;
    notes: string | null;
    createdByUserId: string;
    createdByUsername: string | null;
    createDate: string;
    expiresAt: string | null;
    usedAt: string | null;
    usedBySessionId: number | null;
    status: TopicInviteLinkStatus;
}

export type PagedTopicInviteLinksResponse = PagedInviteLinksResponse<TopicInviteLinkDTO>;

export interface CreateTopicInviteLinkRequest {
    topicId: number;
    linkKind: TopicInviteLinkKind;
    chatType: TopicInviteLinkChatType;
    anonymity: TopicInviteLinkAnonymity;
    expiresInDays?: number;
    notes?: string;
}

export interface ListTopicInviteLinksParams {
    page?: number;
    size?: number;
    tenantId?: number;
    /** Without it the server returns every link kind, account invites included. */
    linkKind?: TopicInviteLinkKind;
    status?: TopicInviteLinkStatus;
}

export const buildTopicInviteLinkUrl = (token: string, topicName?: string | null): string => {
    const base = appURL.replace(/\/$/, '');
    const name = topicName?.trim();
    if (!name || name === 'null' || name === 'undefined') {
        return `${base}/invite/${token}`;
    }
    return `${base}/invite/${token}/${encodeURIComponent(name)}`;
};

export interface LiveChatLinkTopic {
    id: number;
    name: string;
}

export const listLiveChatLinkTopics = async (tenantId: number, signal?: AbortSignal): Promise<LiveChatLinkTopic[]> => {
    const topics = await fetchData({
        url: `${invitelinksEndpoint}/topics`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        headersData: inviteLinkHeaders(tenantId),
        responseHandling: [FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL_SILENT],
        signal,
    });
    return Array.isArray(topics) ? topics : [];
};

/** invite-link-apis.json #5 — GET ?page=0&size=20 + Authorization + X-Tenant-Id */
export const listTopicInviteLinks = async (
    params: ListTopicInviteLinksParams = {},
): Promise<PagedTopicInviteLinksResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const raw = await fetchData({
        url: `${invitelinksEndpoint}?${buildListQueryString(page, size, {
            linkKind: params.linkKind,
            status: params.status,
        })}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        headersData: inviteLinkHeaders(params.tenantId),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

    return normalizeListResponse<TopicInviteLinkDTO>(withUtcInstants(raw), page, size);
};

/** invite-link-apis.json #2 — POST topic-based link + Authorization + X-Tenant-Id */
export const createTopicInviteLink = async (
    body: CreateTopicInviteLinkRequest,
    tenantId?: number,
): Promise<TopicInviteLinkDTO> => {
    const payload: Record<string, unknown> = {
        topicId: body.topicId,
        linkKind: body.linkKind,
        chatType: body.chatType,
        anonymity: body.anonymity,
    };
    if (body.notes != null) {
        payload.notes = body.notes;
    }
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

/** POST /useradmin/invitelinks/{id}/deactivate — switches an ACTIVE link off (status DISABLED). */
export const deactivateTopicInviteLink = async (linkId: number, tenantId?: number): Promise<TopicInviteLinkDTO> => {
    const response = await fetchData({
        url: `${invitelinksEndpoint}/${linkId}/deactivate`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        headersData: inviteLinkHeaders(tenantId),
        // The tab shows its own error; CATCH_ALL would stack a second, generic toast on it.
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
    return withUtcInstants(await response.json());
};

/** POST /useradmin/invitelinks/{id}/reactivate — switches a DISABLED live-chat link back on. */
export const reactivateTopicInviteLink = async (linkId: number, tenantId?: number): Promise<TopicInviteLinkDTO> => {
    const response = await fetchData({
        url: `${invitelinksEndpoint}/${linkId}/reactivate`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        headersData: inviteLinkHeaders(tenantId),
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
    return withUtcInstants(await response.json());
};

/** DELETE /useradmin/invitelinks/{id} — removes a live-chat link for good. */
export const deleteTopicInviteLink = async (linkId: number, tenantId?: number): Promise<void> => {
    await fetchData({
        url: `${invitelinksEndpoint}/${linkId}`,
        method: FETCH_METHODS.DELETE,
        skipAuth: false,
        headersData: inviteLinkHeaders(tenantId),
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
};

export const CHAT_TYPE_OPTIONS: { value: TopicInviteLinkChatType; label: string }[] = [
    { value: 'LIVE_CHAT', label: 'Live Chat' },
];

export const formatChatTypeLabel = (chatType: string): string => {
    if (chatType === 'LIVE_CHAT') return 'Live Chat';
    return chatType;
};

export const formatAnonymityLabel = (anonymity: string): string => {
    if (anonymity === 'FULL') return 'Full';
    return anonymity;
};
