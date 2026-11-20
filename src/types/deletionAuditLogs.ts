export type DeletionAuditTargetType = 'CONSULTANT' | 'AGENCY_ADMIN' | 'TENANT_ADMIN' | 'AGENCY' | 'TENANT';

export type DeletionAuditOutcome = 'SCHEDULED' | 'EXECUTED' | 'CANCELLED';

/** Opaque ids and labels only — the backend never stores names, e-mails or messages here. */
export interface DeletionAuditLogEntry {
    id: number;
    /** null when the system (scheduler) acted. */
    actorId?: string | null;
    actorRole: string;
    targetType: DeletionAuditTargetType | string;
    targetId: string;
    tenantId?: number | null;
    outcome: DeletionAuditOutcome | string;
    createDate: string;
}

export interface DeletionAuditLogsResponse {
    data: DeletionAuditLogEntry[];
    total: number;
    page: number;
    perPage: number;
}
