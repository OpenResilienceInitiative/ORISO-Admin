export type SupervisorLogAction = 'ADDED' | 'REMOVED' | 'REPLACED';

export interface SupervisorLogEntry {
    relationId: number;
    sessionId: number;
    action: SupervisorLogAction | string;
    eventDate: string; // ISO date-time
    supervisorConsultantId: string;
    supervisorUsername?: string | null;
    supervisorName?: string | null;
    /** REPLACED only (#2494 *6): the supervisor who was replaced. */
    previousSupervisorConsultantId?: string | null;
    previousSupervisorUsername?: string | null;
    previousSupervisorName?: string | null;
    /** Who made the change: added, removed or replaced. Null for removals recorded before #2494. */
    actorConsultantId?: string | null;
    actorUsername?: string | null;
    actorName?: string | null;
    /** The justification the counsellor typed. */
    notes?: string | null;
    reasonCode?: string | null;
}

export interface SupervisorLogsResponse {
    data: SupervisorLogEntry[];
    total: number;
    page: number;
    perPage: number;
}
