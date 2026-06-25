export interface CaseHandoverLogEntry {
    requestId: number;
    sessionId: number;
    status: string;
    auditOutcome?: string | null;
    reasonCode: string;
    reasonLabel: string;
    explanation: string;
    clientConsentRequired: boolean;
    policyAuthority?: string | null;
    createdAt: string;
    resolvedAt?: string | null;
    requesterConsultantId: string;
    requesterUsername?: string | null;
    requesterName?: string | null;
    previousConsultantId?: string | null;
    previousUsername?: string | null;
    previousName?: string | null;
}

export interface CaseHandoverLogsResponse {
    data: CaseHandoverLogEntry[];
    total: number;
    page: number;
    perPage: number;
}
