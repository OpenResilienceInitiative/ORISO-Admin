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

/** Who a counsellor can pick for an internal group chat (ORISO-TenantService#321). */
export type RecipientScope = 'PLATFORM' | 'TENANT' | 'AGENCY';

export type RecipientScopePolicy = PolicyValue<RecipientScope>;

/** `internalGroupChat` block of the tenant settings API. `inherited` is read-only and never written. */
export type InternalGroupChatPolicies = {
    recipientScope?: RecipientScopePolicy;
};

/** Whose calendars a counsellor can show beside their own (ADR-032, ORISO-TenantService#365). */
export type CalendarVisibilityScope = 'AGENCY' | 'TENANT' | 'PLATFORM';

export type CalendarVisibilityScopePolicy = PolicyValue<CalendarVisibilityScope>;

/**
 * `calendar` block of the tenant settings API (ADR-032). Unset means AGENCY / no usernames.
 * `inherited` is read-only and never written.
 */
export type CalendarPolicies = {
    visibilityScope?: CalendarVisibilityScopePolicy;
    showAskerUsernames?: PolicyValue<boolean>;
};

/**
 * How counsellors of a centre share a Mailberatung case, as the APIs name it
 * (ORISO-TenantService#374). Exactly one applies.
 */
export type CaseSharingApiMode = 'CASE_HANDOVER' | 'TEAM_COUNSELLING' | 'NONE';

/** `caseSharing` block of the tenant settings API. `inherited` is read-only and never written. */
export type CaseSharingPolicies = {
    mode?: PolicyValue<CaseSharingApiMode>;
};

export type TenantPermissionPolicies = {
    tenantId: number;
    policies: Record<string, PolicyValue<boolean>>;
    internalGroupChat?: InternalGroupChatPolicies;
    calendar?: CalendarPolicies;
    /** Absent from a TenantService before #374: the page then keeps the separate handover tile. */
    caseSharing?: CaseSharingPolicies;
    caseHandoverPolicies?: {
        reasons: Record<string, CaseHandoverReasonPermissionPolicy>;
    };
};
