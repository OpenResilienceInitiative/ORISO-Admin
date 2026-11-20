import type {
    InternalGroupChatPolicies,
    PermissionPolicyMode,
    RecipientScope,
    RecipientScopePolicy,
} from '../../../../../types/permissionPolicy';

/** Options in the order they widen: the centre, its Träger, the whole platform. */
export const RECIPIENT_SCOPES: readonly RecipientScope[] = ['AGENCY', 'TENANT', 'PLATFORM'];

/** What the backend answers while nothing is set anywhere (ORISO-TenantService#321). */
export const DEFAULT_RECIPIENT_SCOPE_POLICY: RecipientScopePolicy = {
    value: 'AGENCY',
    mode: 'SUGGESTED',
    inherited: true,
};

const MODES: readonly PermissionPolicyMode[] = ['SUGGESTED', 'ENFORCED'];

/**
 * Reads the setting tolerantly: an older backend sends no `internalGroupChat` at all, and the page
 * must then show the default and still allow saving rather than break.
 */
export const resolveRecipientScopePolicy = (raw?: Partial<RecipientScopePolicy> | null): RecipientScopePolicy => {
    if (!raw?.value || !RECIPIENT_SCOPES.includes(raw.value)) {
        return DEFAULT_RECIPIENT_SCOPE_POLICY;
    }
    return {
        value: raw.value,
        mode: raw.mode && MODES.includes(raw.mode) ? raw.mode : 'SUGGESTED',
        inherited: raw.inherited === true,
    };
};

/** Same rule as the other permission tiles: a requirement set above is read-only below. */
export const isRecipientScopeLocked = (policy: RecipientScopePolicy, level: 'platform' | 'tenant' | 'agency') =>
    level !== 'platform' && policy.mode === 'ENFORCED' && policy.inherited === true;

/** The request-body part for a change: value and mode only, `inherited` is read-only. */
export const toRecipientScopeWrite = ({
    value,
    mode,
}: RecipientScopePolicy): {
    internalGroupChat: Required<InternalGroupChatPolicies>;
} => ({ internalGroupChat: { recipientScope: { value, mode } } });

/**
 * Body for saving something else on a Träger (a switch): the resolved scope is left out. Echoing an
 * inherited value would turn it into a Träger override that no longer follows the platform;
 * omitting it keeps whatever override is stored (ORISO-TenantService#321).
 */
export const withoutInternalGroupChat = <T extends { internalGroupChat?: InternalGroupChatPolicies }>(
    body: T,
): Omit<T, 'internalGroupChat'> => {
    const rest = { ...body };
    delete rest.internalGroupChat;
    return rest;
};

/**
 * Platform controls as they go back to the server when something else changes: a stored scope stays
 * (without the read-only `inherited` marker), the untouched default is not turned into a stored value.
 */
export const withStoredScopeOnly = <T extends { internalGroupChat?: InternalGroupChatPolicies }>(body: T): T => {
    const scope = body.internalGroupChat?.recipientScope;
    if (!scope || scope.inherited) {
        return withoutInternalGroupChat(body) as T;
    }
    return { ...body, ...toRecipientScopeWrite(scope) };
};
