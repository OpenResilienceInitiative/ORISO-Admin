export interface InactiveAccountAuditLogEntry {
    id: number;
    accountRole: 'ASKER' | 'CONSULTANT' | 'ADMIN' | string;
    accountId: string;
    accountTenantId?: number | null;
    lastActivityAt?: string | null;
    thresholdDays: number;
    recipientAdminId: string;
    recipientEmail: string;
    emailDispatched: boolean;
    createDate: string;
}

export interface InactiveAccountAuditLogsResponse {
    data: InactiveAccountAuditLogEntry[];
    total: number;
    page: number;
    perPage: number;
}
