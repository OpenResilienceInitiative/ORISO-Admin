export type InviteLinkStatus = 'ACTIVE' | 'USED' | 'EXPIRED';

export interface ExternalInboundLinkRow {
    id: string;
    chatType: string;
    topic: string;
    createdAt: string;
    createdBy: string;
    notes: string;
    status: InviteLinkStatus;
    expiresAt: string;
    anonymity: string;
}

export interface TenantInviteLinkRow {
    id: string;
    tenant: string;
    agency: string;
    createdAt: string;
    createdBy: string;
    status: InviteLinkStatus;
    expiresAt: string;
    usedAt: string | null;
}

export interface CounsellorInviteLinkRow {
    id: string;
    counsellor: string;
    createdAt: string;
    createdBy: string;
    status: InviteLinkStatus;
    expiresAt: string;
    usedAt: string | null;
}
