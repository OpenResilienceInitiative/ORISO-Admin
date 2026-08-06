/** Publication state of a department's (Fachbereich) data privacy policy. */
export type DepartmentPublicationStatus = 'DRAFT' | 'PUBLISHED';

/** Response of the Fachbereich DPP publish endpoint. */
export interface DepartmentDataProtectionResponse {
    publicationStatus: DepartmentPublicationStatus;
}

/** Stored Fachbereich DPP returned by the read endpoint (prefill). */
export interface DepartmentDataProtectionContent {
    /** Multilingual JSON language→HTML map string; null/absent if never authored. */
    content?: string | null;
    publicationStatus: DepartmentPublicationStatus;
}
