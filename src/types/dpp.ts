/** Publication state of a department's (Fachbereich) data privacy policy. */
export type DepartmentPublicationStatus = 'DRAFT' | 'PUBLISHED';

/** Response of the Fachbereich DPP publish endpoint. */
export interface DepartmentDataProtectionResponse {
    publicationStatus: DepartmentPublicationStatus;
}
