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
     * `null` = the backend knows the field and nothing was authored. `undefined` = it is
     * simply not in the payload, which since #929 means the same thing: a policy that was
     * read carries a consent field, empty or not. Whether the key is present is a
     * serialisation detail of the service and must not decide what the editor offers.
     */
    consentText?: string | null;
}

/**
 * Whether a resolved read actually produced one of these documents.
 *
 * `fetchData` resolves a `204` with the raw `Response` and a JSON `null` body with `null`,
 * and neither marks the query as failed. A caller that inferred "this department has no
 * text" from such a payload would seed its editor with the INHERITED text and let a publish
 * store that as the department's own — so the shape is checked before it is believed.
 */
export const isLegalDocumentPayload = (data: unknown): data is DepartmentDataProtectionContent =>
    typeof data === 'object' && data !== null && !(data instanceof Response);
