export interface CaseHandoverReasonPolicy {
    code: string;
    label: string;
    clientConsentRequired: boolean;
    accessAllowed: boolean;
    enabled: boolean;
    displayOrder: number;
    policyAuthority?: string | null;
}
