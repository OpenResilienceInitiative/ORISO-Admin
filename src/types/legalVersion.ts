/**
 * Generic legal-text version history (ADR-021 decision 3).
 *
 * The shape is the `LegalTextVersionDTO` of ORISO-AgencyService#256, which
 * generalises the AVV/DPA mechanism (`tenant_dpa_version`, TenantService
 * changeset 0018) over the legal-text kind and the levels of the ladder
 * (platform operator → Träger → Beratungsstelle → Fachbereich).
 */

/**
 * Which legal text a version belongs to. The values are the wire enum of the
 * `kind` query parameter, not path segments: #256 serves ONE `legal-versions`
 * collection per level and selects the document with `?kind=`.
 */
export type LegalTextKind = 'DPP' | 'IMPRINT';

/**
 * Which rung of the ADR-021 ladder owns a version. `SHARED` is an ADR-014 shared
 * legal-text object. The Träger and platform levels are absent on purpose: #256
 * states their history has to be built in ORISO-TenantService and does not exist
 * yet (known gap 2 of that PR).
 */
export type LegalTextOwnerLevel = 'DEPARTMENT' | 'AGENCY' | 'SHARED';

/** One archived, published legal-text version. Newest first in every list. */
export interface LegalTextVersion {
    /**
     * Surrogate identity of this version — the ONLY key a client may use.
     * Deliberately not the publication timestamp: MariaDB `datetime` has no
     * sub-second precision, and keying versions by their timestamp is what
     * forced the AVV work to truncate to seconds and made equality matches fail
     * silently (#256).
     */
    id: number;
    kind: LegalTextKind;
    ownerLevel: LegalTextOwnerLevel;
    /** Id of the owning row, interpreted per `ownerLevel`. */
    ownerId: number;
    /** Published content: JSON map language → HTML (legacy plain HTML tolerated). */
    content?: string | null;
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
    /** When this wording came into force (ISO). */
    publishedAt: string;
    /**
     * Keycloak user id of the publisher, or null where none was recorded. Null is
     * an honest unknown, never a guessed value.
     */
    publishedBy?: string | null;
    /** When a newer version replaced this one; null = still in force. */
    supersededAt?: string | null;
}

/** Which level (and which object on it) a version history is requested for. */
export type LegalVersionScope =
    | { level: 'tenant'; tenantId: number; kind: LegalTextKind }
    | { level: 'agency'; agencyId: number; kind: LegalTextKind }
    | { level: 'department'; agencyId: number; topicId: number; kind: LegalTextKind };
