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
