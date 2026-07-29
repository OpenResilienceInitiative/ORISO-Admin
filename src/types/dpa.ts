/** A published DPA version snapshot returned by the tenant service. */
export interface DpaVersion {
    /** Activation timestamp (ISO) that identifies this version. */
    activationDate: string;
    /** The published multilingual content (JSON map language -> HTML). */
    content: string;
}

/** The DPA consultation-gate status for a tenant. */
export interface DpaGateStatus {
    dpaPublished: boolean;
    dpaSigned: boolean;
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
    /** Activation timestamp of the currently published DPA version, if any. */
    currentDpaVersion?: string | null;
    /** Newest DPA version a signature exists for, if any. */
    signedDpaVersion?: string | null;
    signedAt?: string | null;
    signedBy?: string | null;
}

/** Request body of the U9 sign endpoint (DpaAdminSignRequestDTO). */
export interface DpaAdminSignRequest {
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
