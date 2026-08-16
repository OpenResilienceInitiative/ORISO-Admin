export type PermissionPolicyMode = 'ENFORCED' | 'SUGGESTED';

export type PolicyValue<T> = {
    value: T;
    mode: PermissionPolicyMode;
    inherited?: boolean;
};

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
