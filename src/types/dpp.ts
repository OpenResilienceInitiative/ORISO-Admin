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
 *
 * `publicationStatus` is what is checked, and deliberately not `content` or `consentText`:
 * it is the only property the read contract marks REQUIRED (same for the imprint read), while
 * the other two are nullable and may or may not appear depending on how the service serialises
 * nulls. Keying the guard on one of those would re-create #929 — a healthy read of a
 * never-authored department would fail closed and hide the editor again.
 */
export const isLegalDocumentPayload = (data: unknown): data is DepartmentDataProtectionContent =>
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    !(data instanceof Response) &&
    ((data as DepartmentDataProtectionContent).publicationStatus === 'DRAFT' ||
        (data as DepartmentDataProtectionContent).publicationStatus === 'PUBLISHED');
