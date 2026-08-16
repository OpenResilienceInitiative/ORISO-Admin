/**
 * Generic legal-text version history (ADR-021 decision 3).
 *
 * The AVV/DPA mechanism (`tenant_dpa_version`, TenantService changeset 0018,
 * `GET /tenantadmin/{id}/dpa/versions`) is the blueprint — this is the same
 * shape, generalised over the legal-text kind and the four levels of the
 * ladder (platform operator → Träger → Beratungsstelle → Fachbereich).
 */

/**
 * Which legal text a version belongs to. The values are the path segments the
 * existing endpoints already use (`/topics/{id}/dpp`, `/topics/{id}/imprint`),
 * so the history endpoints stay consistent with the read/publish endpoints.
 */
export type LegalTextKind = 'privacy' | 'imprint' | 'dpp';

/** One archived, published legal-text version. Newest first in every list. */
export interface LegalTextVersion {
    /** Activation timestamp (ISO) — the stable id of this version. */
    activationDate: string;
    /** Published content: JSON map language → HTML (legacy plain HTML tolerated). */
    content: string;
    /**
     * The consent sentence that belonged to THIS version of the data-protection
     * policy (ADR-021 decision 4 — the consent text is a field of the DPP, not a
     * legal text of its own, so one version pointer answers "which consent
     * belonged to which policy"). JSON map language → plain sentence.
     *
     * `undefined` means the backend does not carry the field yet; `null` means it
     * does and this version has no consent sentence. The editors use exactly that
     * distinction to decide whether to offer the consent field at all.
     */
    consentText?: string | null;
}

/** Which level (and which object on it) a version history is requested for. */
export type LegalVersionScope =
    | { level: 'tenant'; tenantId: number; kind: Extract<LegalTextKind, 'privacy' | 'imprint'> }
    | { level: 'agency'; agencyId: number; kind: Extract<LegalTextKind, 'dpp' | 'imprint'> }
    | { level: 'department'; agencyId: number; topicId: number; kind: Extract<LegalTextKind, 'dpp' | 'imprint'> };
