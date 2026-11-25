/** A published DPA version snapshot returned by the tenant service. */
export interface DpaVersion {
    /** Activation timestamp (ISO) that identifies this version. */
    activationDate: string;
    /** The published multilingual content (JSON map language -> HTML). */
    content: string;
    signingDeadlineAt?: string | null;
}

/** The DPA consultation-gate status for a tenant. */
export interface DpaGateStatus {
    dpaPublished: boolean;
    dpaSigned: boolean;
    dpaStatus?: TenantDpaStatus;
    currentDpaVersion?: string | null;
    signingDeadlineAt?: string | null;
    renewalGraceActive?: boolean;
    newCounsellingAllowed?: boolean;
    /**
     * Additive flag (ORISO-Admin#723 contract correction): not signed, but an
     * unexpired forwarded sign link is outstanding. Never true alongside a
     * valid signature. Absent on older backends.
     */
    dpaForwardPending?: boolean;
}

/** Single-use public DPA signing invitation. The raw token is deliberately not used by the UI. */
export interface DpaSignInvite {
    signLink: string;
    expiresAt: string;
}

/**
 * Authoritative per-tenant DPA state (TEN-INV-U9, TenantService
 * GET /tenantadmin/{id}/dpa/status — see api/tenantservice.yaml DpaStatusDTO).
 */
export type TenantDpaStatus = 'MISSING' | 'UNSIGNED' | 'OUTDATED' | 'VALID' | 'INCONSISTENT';

/** Response of the U9 status endpoint (DpaStatusDTO). */
export interface TenantDpaStatusInfo {
    tenantId: number;
    status: TenantDpaStatus;
    newCounsellingAllowed?: boolean;
    signingDeadlineAt?: string | null;
    renewalGraceActive?: boolean;
    /** Activation timestamp of the currently published DPA version, if any. */
    currentDpaVersion?: string | null;
    /** Newest DPA version a signature exists for, if any. */
    signedDpaVersion?: string | null;
    signedAt?: string | null;
    signedBy?: string | null;
    /**
     * Additive flag (ORISO-Admin#723 contract correction): the signature was
     * forwarded to an authorised signer and an unexpired link is outstanding.
     * Orthogonal to `status` — never true for VALID, MISSING or INCONSISTENT.
     * The `status` enum itself is UNCHANGED (no PENDING_FORWARDED value).
     */
    forwardPending?: boolean;
}

/** Request body of the U9 sign endpoint (DpaAdminSignRequestDTO). */
export interface DpaAdminSignRequest {
    /** Exact stored version of the contract displayed and accepted by the admin. */
    dpaVersion: string;
    signerName: string;
    signerPosition?: string;
    signerEmail?: string;
    signerOrganisation?: string;
    /** Must be true — the signer explicitly accepted the current DPA version. */
    accepted: boolean;
    language?: string;
}

export interface DpaSignature {
    status: 'PENDING' | 'SIGNED' | 'DENIED';
    signerName?: string | null;
    signerPosition?: string | null;
    signerEmail?: string | null;
    signerOrganisation?: string | null;
    signedAt?: string | null;
    source?: string | null;
}
