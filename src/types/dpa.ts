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

export interface DpaSignature {
    status: 'PENDING' | 'SIGNED' | 'DENIED';
    signerName?: string | null;
    signerPosition?: string | null;
    signerEmail?: string | null;
    signerOrganisation?: string | null;
    signedAt?: string | null;
    source?: string | null;
}
