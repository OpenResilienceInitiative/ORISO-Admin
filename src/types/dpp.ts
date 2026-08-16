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
    /**
     * The consent sentence stored WITH this policy (ADR-021 decision 4) as a
     * multilingual JSON language→sentence map string.
     *
     * TODO(#250): added by ORISO-AgencyService branch `feat/legal-text-versioning-250`.
     * `undefined` = the deployed backend does not know the field yet, and the Admin
     * hides the consent editor rather than offering an input that cannot be saved;
     * `null` = the backend knows it and nothing was authored.
     */
    consentText?: string | null;
}
