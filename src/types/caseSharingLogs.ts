/** The case sharing model a Beratungsstelle starts new cases under (ORISO-Frontend#2494). */
export type CaseSharingModel = 'CASE_HANDOVER' | 'TEAM_COUNSELLING' | 'NONE';

/** Where the switch was made: the agency settings, or by changing the type of the Beratungsstelle. */
export type CaseSharingChangeSource = 'AGENCY_SETTINGS' | 'AGENCY_TYPE';

/** One switch of a Beratungsstelle's case sharing model. It applies to new cases only. */
export interface CaseSharingChangeEntry {
    id: number;
    agencyId: number;
    agencyName?: string | null;
    tenantId?: number | null;
    changedAt: string;
    /** null when the system made the change. */
    changedBy?: string | null;
    /** null for the first recorded model of a Beratungsstelle. */
    previousModel?: CaseSharingModel | string | null;
    newModel: CaseSharingModel | string;
    source: CaseSharingChangeSource | string;
}

/** `GET /service/agencyadmin/agencies/case-sharing-changes`, newest first. */
export interface CaseSharingChangesResponse {
    total: number;
    entries: CaseSharingChangeEntry[];
}
