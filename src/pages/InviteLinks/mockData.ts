import { CounsellorInviteLinkRow, ExternalInboundLinkRow, TenantInviteLinkRow } from './types';

export const MOCK_EXTERNAL_INBOUND_LINKS: ExternalInboundLinkRow[] = [
    {
        id: '1',
        chatType: 'Live Chat',
        topic: 'Schuldenberatung',
        createdAt: '9.5.2026, 17:40:01',
        createdBy: 'PlatformAdminX43',
        notes: '',
        status: 'ACTIVE',
        expiresAt: 'Niemals',
        anonymity: 'Full',
    },
];

export const MOCK_TENANT_INVITE_LINKS: TenantInviteLinkRow[] = [
    {
        id: '1',
        tenant: 'Caritas Berlin',
        agency: '10115 Zentrum Mitte',
        createdAt: '8.5.2026, 14:22:00',
        createdBy: 'PlatformAdminX43',
        status: 'ACTIVE',
        expiresAt: '7.6.2026',
        usedAt: null,
    },
];

export const MOCK_COUNSELLOR_INVITE_LINKS: CounsellorInviteLinkRow[] = [
    {
        id: '1',
        counsellor: 'Dr. Anna Schmidt',
        createdAt: '7.5.2026, 09:15:30',
        createdBy: 'PlatformAdminX43',
        status: 'USED',
        expiresAt: 'Niemals',
        usedAt: '7.5.2026, 11:02:18',
    },
];

export const CHAT_TYPE_OPTIONS = [{ value: 'live_chat', label: 'Live Chat' }] as const;
