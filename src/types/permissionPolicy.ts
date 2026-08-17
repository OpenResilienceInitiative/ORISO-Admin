export type PermissionPolicyMode = 'ENFORCED' | 'SUGGESTED';

export type PolicyValue<T> = {
    value: T;
    mode: PermissionPolicyMode;
    inherited?: boolean;
};

/** How an advice seeker participates in a reason-specific Case Handover grant. */
export type CaseHandoverConsentValue = 'OPT_IN' | 'OPT_OUT' | 'NONE';

export type CaseHandoverConsentPolicy = PolicyValue<CaseHandoverConsentValue>;

export type MultilingualTextPolicy = PolicyValue<Record<string, string>>;

export type CaseHandoverReasonPermissionPolicy = {
    code: string;
    labels: MultilingualTextPolicy;
    enabled: PolicyValue<boolean>;
    accessAllowed: PolicyValue<boolean>;
    clientConsentRequired: PolicyValue<boolean>;
    approvalRoles: PolicyValue<string[]>;
    clientNotificationTemplates: MultilingualTextPolicy;
    maxAccessDurationMinutes?: PolicyValue<number>;
};

export type TenantPermissionPolicies = {
    tenantId: number;
    policies: Record<string, PolicyValue<boolean>>;
    caseHandoverPolicies?: {
        reasons: Record<string, CaseHandoverReasonPermissionPolicy>;
    };
};
