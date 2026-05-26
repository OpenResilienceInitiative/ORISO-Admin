import { appURL, mainURL } from '../../appConfig';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

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
    consultantId?: string | null;
    notes?: string | null;
    expiresInDays?: number | null;
}

export interface ListTopicInviteLinksParams {
    linkKind?: TopicInviteLinkKind;
    topicId?: number;
    chatType?: TopicInviteLinkChatType;
    status?: TopicInviteLinkStatus;
    page?: number;
    size?: number;
}

const inviteLinkHeaders = (): Record<string, string> => {
    const { tenantId } = parseUserAuthInfo();
    if (!tenantId) {
        return {};
    }
    return { 'X-Tenant-Id': String(tenantId) };
};

const buildQueryString = (params: ListTopicInviteLinksParams): string => {
    const search = new URLSearchParams();
    if (params.linkKind) search.set('linkKind', params.linkKind);
    if (params.topicId != null) search.set('topicId', String(params.topicId));
    if (params.chatType) search.set('chatType', params.chatType);
    if (params.status) search.set('status', params.status);
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 20));
    return search.toString();
};

export const buildTopicInviteLinkUrl = (token: string, topicName: string): string => {
    const base = appURL.replace(/\/$/, '');
    return `${base}/invite/${token}/${encodeURIComponent(topicName)}`;
};

export const listTopicInviteLinks = async (
    params: ListTopicInviteLinksParams = {},
): Promise<PagedTopicInviteLinksResponse> =>
    fetchData({
        url: `${invitelinksEndpoint}?${buildQueryString(params)}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        headersData: inviteLinkHeaders(),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });

export const createTopicInviteLink = async (body: CreateTopicInviteLinkRequest): Promise<TopicInviteLinkDTO> => {
    const response = await fetchData({
        url: invitelinksEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        headersData: inviteLinkHeaders(),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(body),
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
