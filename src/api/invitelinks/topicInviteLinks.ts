import { appURL, mainURL } from '../../appConfig';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** POST/GET {{baseUrl}}/useradmin/invitelinks — see invite-link-apis.json */
const invitelinksEndpoint = `${mainURL}/service/useradmin/invitelinks`;

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

export interface PagedTopicInviteLinksResponse {
    content: TopicInviteLinkDTO[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
}

export interface CreateTopicInviteLinkRequest {
    topicId: number;
    linkKind: TopicInviteLinkKind;
    chatType: TopicInviteLinkChatType;
    anonymity: TopicInviteLinkAnonymity;
    expiresInDays?: number;
}

export interface ListTopicInviteLinksParams {
    page?: number;
    size?: number;
}

const inviteLinkHeaders = (): Record<string, string> => {
    const { tenantId } = parseUserAuthInfo();
    // Super-admin tokens use tenantId 0; Postman collection defaults to tenant 1.
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : 1;
    return { 'X-Tenant-Id': String(resolvedTenantId) };
};

const buildListQueryString = (page: number, size: number): string => {
    const search = new URLSearchParams();
    search.set('page', String(page));
    search.set('size', String(size));
    return search.toString();
};

const normalizeListResponse = (
    raw: PagedTopicInviteLinksResponse | TopicInviteLinkDTO[],
    page: number,
    size: number,
): PagedTopicInviteLinksResponse => {
    if (Array.isArray(raw)) {
        return {
            content: raw,
            totalElements: raw.length,
            totalPages: 1,
            page,
            size,
        };
    }

    return {
        content: raw.content ?? [],
        totalElements: raw.totalElements ?? 0,
        totalPages: raw.totalPages ?? 0,
        page: raw.page ?? page,
        size: raw.size ?? size,
    };
};

export const buildTopicInviteLinkUrl = (token: string, topicName: string): string => {
    const base = appURL.replace(/\/$/, '');
    return `${base}/invite/${token}/${encodeURIComponent(topicName)}`;
};

/** Paginated list — invite-link-apis.json #5: GET ?page=0&size=20 + Authorization + X-Tenant-Id. */
export const listTopicInviteLinks = async (
    params: ListTopicInviteLinksParams = {},
): Promise<PagedTopicInviteLinksResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const raw = await fetchData({
        url: `${invitelinksEndpoint}?${buildListQueryString(page, size)}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        headersData: inviteLinkHeaders(),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

    return normalizeListResponse(raw, page, size);
};

/** Create topic-based link — invite-link-apis.json #2 (linkKind EXTERNAL_INBOUND for this tab). */
export const createTopicInviteLink = async (body: CreateTopicInviteLinkRequest): Promise<TopicInviteLinkDTO> => {
    const payload: Record<string, unknown> = {
        topicId: body.topicId,
        linkKind: body.linkKind,
        chatType: body.chatType,
        anonymity: body.anonymity,
    };
    if (body.expiresInDays != null) {
        payload.expiresInDays = body.expiresInDays;
    }

    const response = await fetchData({
        url: invitelinksEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        headersData: inviteLinkHeaders(),
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
