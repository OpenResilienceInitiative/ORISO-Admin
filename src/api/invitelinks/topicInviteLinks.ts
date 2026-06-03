import { appURL } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
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
export type TopicInviteLinkStatus = 'ACTIVE' | 'USED' | 'EXPIRED';

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
}

export const buildTopicInviteLinkUrl = (token: string, topicName?: string | null): string => {
    const base = appURL.replace(/\/$/, '');
    const name = topicName?.trim();
    if (!name || name === 'null' || name === 'undefined') {
        return `${base}/invite/${token}`;
    }
    return `${base}/invite/${token}/${encodeURIComponent(name)}`;
};

/** invite-link-apis.json #5 — GET ?page=0&size=20 + Authorization + X-Tenant-Id */
export const listTopicInviteLinks = async (
    params: ListTopicInviteLinksParams = {},
): Promise<PagedTopicInviteLinksResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const raw = await fetchData({
        url: `${invitelinksEndpoint}?${buildListQueryString(page, size)}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        headersData: inviteLinkHeaders(params.tenantId),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

    return normalizeListResponse<TopicInviteLinkDTO>(raw, page, size);
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
