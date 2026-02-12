export interface SupervisorLogEntry {
    relationId: number;
    sessionId: number;
    action: 'ADDED' | 'REMOVED' | string;
    eventDate: string; // ISO date-time
    supervisorConsultantId: string;
    supervisorUsername?: string | null;
    supervisorName?: string | null;
    actorConsultantId: string;
    actorUsername?: string | null;
    actorName?: string | null;
    notes?: string | null;
}

export interface SupervisorLogsResponse {
    data: SupervisorLogEntry[];
    total: number;
    page: number;
    perPage: number;
}


