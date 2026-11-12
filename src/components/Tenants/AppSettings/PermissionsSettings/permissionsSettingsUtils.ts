import { PermissionToggleVisibility } from '../../../../types/PermissionToggleVisibility';
import { TenantAdminControls } from '../../../../types/TenantAdminControls';
import type { TenantSettings } from '../../../../types/tenant';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import type { ChatTypeCardDef } from './types';

/** Where the value a tile shows comes from (ORISO-TenantService#363). */
export type PermissionPolicySource = 'own' | 'suggested' | 'enforced' | 'forbidden';

/**
 * The effective value of one feature at this level (ORISO-TenantService#363):
 * 1. a requirement from above (enforced on / forbidden) always wins and is locked;
 * 2. otherwise a policy decides: `inherited: false` is this level's own choice, `inherited: true`
 *    means it never chose, so the suggestion from above is the value — whatever raw setting is stored;
 * 3. only without any policy does `ownValue`, the raw boolean this level stored, count as its choice.
 */
export const resolvePermissionPolicy = (
    permissionPolicies: Record<string, PolicyValue<boolean>> | undefined,
    fieldKey: string,
    currentValue: unknown,
    restrictedFields: ReadonlySet<string>,
    ownValue?: unknown,
): PolicyValue<boolean> => {
    const policy = permissionPolicies?.[fieldKey];
    if (policy?.mode === 'ENFORCED') return policy;
    if (restrictedFields.has(fieldKey)) return { value: currentValue !== false, mode: 'ENFORCED', inherited: true };
    if (policy) return policy;
    if (typeof ownValue === 'boolean') return { value: ownValue, mode: 'SUGGESTED', inherited: false };
    return { value: currentValue !== false, mode: 'SUGGESTED', inherited: true };
};

export const permissionPolicySource = (policy: PolicyValue<boolean>): PermissionPolicySource => {
    if (policy.mode === 'ENFORCED') return policy.value ? 'enforced' : 'forbidden';
    return policy.inherited === true ? 'suggested' : 'own';
};

/**
 * Initial platform preset (ORISO-TenantService#251): the values a platform that has never touched
 * its preset starts from — every conversation feature on, AI scan off. It is a *seed*, never a
 * stand-in for a value the backend already holds: wherever a stored platform policy or a stored
 * Träger value exists, that value wins (ORISO-Admin#989).
 */
export const DEFAULT_PERMISSION_SETTINGS = {
    featureAnonymousChatEnabled: true,
    featureGroupChatV2Enabled: true,
    // ORISO-Admin#988: the two group cards' own masters, separate from featureGroupChatV2Enabled.
    featureInternalGroupChatEnabled: true,
    featureSelfHelpGroupsEnabled: true,
    featureCallsEnabled: true,
    featureSupervisionEnabled: true,
    featureSupervisionAnonymousChatsEnabled: true,
    featureSupervisionOneOnOneChatsEnabled: true,
    featureAudioCallsEnabled: true,
    featureAudioCallsAnonymousChatsEnabled: true,
    featureAudioCallsOneOnOneChatsEnabled: true,
    featureAudioCallsGroupChatsEnabled: true,
    featureAudioCallsSupervisionChatsEnabled: true,
    featureVideoCallsEnabled: true,
    featureVideoCallsAnonymousChatsEnabled: true,
    featureVideoCallsOneOnOneChatsEnabled: true,
    featureVideoCallsGroupChatsEnabled: true,
    featureVideoCallsSupervisionChatsEnabled: true,
    featureThreadsEnabled: true,
    featureThreadsAnonymousChatsEnabled: true,
    featureThreadsGroupChatsEnabled: true,
    featureThreadsOneOnOneEnabled: true,
    featureThreadsSupervisionChatsEnabled: true,
    featureVoiceMessagesEnabled: true,
    featureVoiceMessagesAnonymousChatsEnabled: true,
    featureVoiceMessagesOneOnOneChatsEnabled: true,
    featureVoiceMessagesGroupChatsEnabled: true,
    featureVoiceMessagesSupervisionChatsEnabled: true,
    featureMediaUploadEnabled: true,
    featureMediaUploadAnonymousChatsEnabled: true,
    featureMediaUploadOneOnOneChatsEnabled: true,
    featureMediaUploadGroupChatsEnabled: true,
    featureMediaUploadSupervisionChatsEnabled: true,
    featureMediaInlineDisplayEnabled: true,
    featureMediaInlineDisplayAnonymousChatsEnabled: true,
    featureMediaInlineDisplayOneOnOneChatsEnabled: true,
    featureMediaInlineDisplayGroupChatsEnabled: true,
    featureMediaInlineDisplaySupervisionChatsEnabled: true,
    // AI scan is opt-in: off until the content-scanner pipeline is deployed and
    // its sub-processor agreement is signed (ADR-019/015, docs/media-ai-scan-enablement.md)
    featureMediaAiScanEnabled: false,
    featureMediaAiScanAnonymousChatsEnabled: false,
    featureMediaAiScanOneOnOneChatsEnabled: false,
    featureMediaAiScanGroupChatsEnabled: false,
    featureMediaAiScanSupervisionChatsEnabled: false,
    // ORISO-Admin#1242: TenantService#332 keeps the stored value when a save omits these, so every
    // save sends them explicitly; default on like every conversation feature.
    featureDirectInviteChatEnabled: true,
    featureDirectInviteAudioEnabled: true,
    featureDirectInviteVideoEnabled: true,
} as const;

export const PLATFORM_TOGGLE_FIELDS: Record<keyof PermissionToggleVisibility, string[]> = {
    anonymousChat: [
        'featureAnonymousChatEnabled',
        'featureVideoCallsAnonymousChatsEnabled',
        'featureAudioCallsAnonymousChatsEnabled',
        'featureVoiceMessagesAnonymousChatsEnabled',
        'featureThreadsAnonymousChatsEnabled',
        'featureSupervisionAnonymousChatsEnabled',
    ],
    groupChat: [
        'featureGroupChatV2Enabled',
        'featureVideoCallsGroupChatsEnabled',
        'featureAudioCallsGroupChatsEnabled',
        'featureVoiceMessagesGroupChatsEnabled',
        'featureThreadsGroupChatsEnabled',
        // ORISO-Admin#988: both group formats are locked off with the group chat family.
        'featureInternalGroupChatEnabled',
        'featureSelfHelpGroupsEnabled',
    ],
    calls: ['featureCallsEnabled'],
    supervision: [
        'featureSupervisionEnabled',
        'featureVideoCallsSupervisionChatsEnabled',
        'featureAudioCallsSupervisionChatsEnabled',
        'featureVoiceMessagesSupervisionChatsEnabled',
        'featureThreadsSupervisionChatsEnabled',
    ],
    supervisionAnonymousChats: ['featureSupervisionAnonymousChatsEnabled'],
    supervisionOneOnOneChats: ['featureSupervisionOneOnOneChatsEnabled'],
    audioCalls: [
        'featureAudioCallsEnabled',
        'featureAudioCallsAnonymousChatsEnabled',
        'featureAudioCallsOneOnOneChatsEnabled',
        'featureAudioCallsGroupChatsEnabled',
        'featureAudioCallsSupervisionChatsEnabled',
    ],
    audioCallsAnonymousChats: ['featureAudioCallsAnonymousChatsEnabled'],
    audioCallsOneOnOneChats: ['featureAudioCallsOneOnOneChatsEnabled'],
    audioCallsGroupChats: ['featureAudioCallsGroupChatsEnabled'],
    audioCallsSupervisionChats: ['featureAudioCallsSupervisionChatsEnabled'],
    videoCalls: [
        'featureVideoCallsEnabled',
        'featureVideoCallsAnonymousChatsEnabled',
        'featureVideoCallsOneOnOneChatsEnabled',
        'featureVideoCallsGroupChatsEnabled',
        'featureVideoCallsSupervisionChatsEnabled',
    ],
    videoCallsAnonymousChats: ['featureVideoCallsAnonymousChatsEnabled'],
    videoCallsOneOnOneChats: ['featureVideoCallsOneOnOneChatsEnabled'],
    videoCallsGroupChats: ['featureVideoCallsGroupChatsEnabled'],
    videoCallsSupervisionChats: ['featureVideoCallsSupervisionChatsEnabled'],
    threads: [
        'featureThreadsEnabled',
        'featureThreadsAnonymousChatsEnabled',
        'featureThreadsOneOnOneEnabled',
        'featureThreadsGroupChatsEnabled',
        'featureThreadsSupervisionChatsEnabled',
    ],
    threadsAnonymousChats: ['featureThreadsAnonymousChatsEnabled'],
    threadsOneOnOneChats: ['featureThreadsOneOnOneEnabled'],
    threadsGroupChats: ['featureThreadsGroupChatsEnabled'],
    threadsSupervisionChats: ['featureThreadsSupervisionChatsEnabled'],
    voiceMessages: [
        'featureVoiceMessagesEnabled',
        'featureVoiceMessagesAnonymousChatsEnabled',
        'featureVoiceMessagesOneOnOneChatsEnabled',
        'featureVoiceMessagesGroupChatsEnabled',
        'featureVoiceMessagesSupervisionChatsEnabled',
    ],
    voiceMessagesAnonymousChats: ['featureVoiceMessagesAnonymousChatsEnabled'],
    voiceMessagesOneOnOneChats: ['featureVoiceMessagesOneOnOneChatsEnabled'],
    voiceMessagesGroupChats: ['featureVoiceMessagesGroupChatsEnabled'],
    voiceMessagesSupervisionChats: ['featureVoiceMessagesSupervisionChatsEnabled'],
    mediaUpload: [
        'featureMediaUploadEnabled',
        'featureMediaUploadAnonymousChatsEnabled',
        'featureMediaUploadOneOnOneChatsEnabled',
        'featureMediaUploadGroupChatsEnabled',
        'featureMediaUploadSupervisionChatsEnabled',
    ],
    mediaUploadAnonymousChats: ['featureMediaUploadAnonymousChatsEnabled'],
    mediaUploadOneOnOneChats: ['featureMediaUploadOneOnOneChatsEnabled'],
    mediaUploadGroupChats: ['featureMediaUploadGroupChatsEnabled'],
    mediaUploadSupervisionChats: ['featureMediaUploadSupervisionChatsEnabled'],
    mediaInlineDisplay: [
        'featureMediaInlineDisplayEnabled',
        'featureMediaInlineDisplayAnonymousChatsEnabled',
        'featureMediaInlineDisplayOneOnOneChatsEnabled',
        'featureMediaInlineDisplayGroupChatsEnabled',
        'featureMediaInlineDisplaySupervisionChatsEnabled',
    ],
    mediaInlineDisplayAnonymousChats: ['featureMediaInlineDisplayAnonymousChatsEnabled'],
    mediaInlineDisplayOneOnOneChats: ['featureMediaInlineDisplayOneOnOneChatsEnabled'],
    mediaInlineDisplayGroupChats: ['featureMediaInlineDisplayGroupChatsEnabled'],
    mediaInlineDisplaySupervisionChats: ['featureMediaInlineDisplaySupervisionChatsEnabled'],
    mediaAiScan: [
        'featureMediaAiScanEnabled',
        'featureMediaAiScanAnonymousChatsEnabled',
        'featureMediaAiScanOneOnOneChatsEnabled',
        'featureMediaAiScanGroupChatsEnabled',
        'featureMediaAiScanSupervisionChatsEnabled',
    ],
    mediaAiScanAnonymousChats: ['featureMediaAiScanAnonymousChatsEnabled'],
    mediaAiScanOneOnOneChats: ['featureMediaAiScanOneOnOneChatsEnabled'],
    mediaAiScanGroupChats: ['featureMediaAiScanGroupChatsEnabled'],
    mediaAiScanSupervisionChats: ['featureMediaAiScanSupervisionChatsEnabled'],
};

/**
 * Direct setting owned by each governance toggle. Family toggles list their own setting first,
 * followed by the child settings they constrain when disabled.
 */
export const TOGGLE_KEY_TO_FIELD = Object.fromEntries(
    (Object.entries(PLATFORM_TOGGLE_FIELDS) as [keyof PermissionToggleVisibility, string[]][]).map(
        ([toggleKey, [directField]]) => [toggleKey, directField],
    ),
) as Record<keyof PermissionToggleVisibility, string>;

const ONE_ON_ONE_CALL_TOGGLE_FIELDS = new Set([
    'featureVideoCallsOneOnOneChatsEnabled',
    'featureAudioCallsOneOnOneChatsEnabled',
]);

export const getForcedOffFields = (toggles?: PermissionToggleVisibility) => {
    if (!toggles) return new Set<string>();

    const fields = Object.entries(toggles).reduce((forcedOffFields, [toggleKey, enabled]) => {
        if (enabled === false) {
            const platformFields = PLATFORM_TOGGLE_FIELDS[toggleKey as keyof PermissionToggleVisibility];
            if (platformFields) {
                platformFields.forEach((field) => forcedOffFields.add(field));
            }
        }
        return forcedOffFields;
    }, new Set<string>());

    // A granular permission is authoritative for its own field. This lets a platform admin opt a
    // chat type into AI scanning even though the hidden family master defaults off.
    Object.entries(toggles).forEach(([toggleKey, enabled]) => {
        if (enabled === true) {
            fields.delete(TOGGLE_KEY_TO_FIELD[toggleKey as keyof PermissionToggleVisibility]);
        }
    });

    return fields;
};

export const applyForcedOffFields = (
    settings: TenantSettings | Record<string, unknown> | undefined,
    forcedOffFields: Set<string>,
) => {
    if (forcedOffFields.size === 0) return settings;

    const nextSettings = { ...(settings ?? {}) } as Record<string, unknown>;
    forcedOffFields.forEach((field) => {
        nextSettings[field] = false;
    });
    return nextSettings;
};

/**
 * Mirror of {@link getForcedOffFields} for the "enforce active state" direction: an upper role
 * (platform → tenant → agency) can lock a feature *on* so lower roles cannot hide it. A truthy
 * enforcement flag expands to every concrete feature field, which the lower level then renders
 * as on-and-disabled.
 */
export const getEnforcedOnFields = (enforcedToggles?: PermissionToggleVisibility) => {
    if (!enforcedToggles) return new Set<string>();

    return Object.entries(enforcedToggles).reduce((fields, [toggleKey, enforced]) => {
        if (enforced === true) {
            const platformFields = PLATFORM_TOGGLE_FIELDS[toggleKey as keyof PermissionToggleVisibility];
            if (platformFields) {
                platformFields.forEach((field) => fields.add(field));
            }
        }
        return fields;
    }, new Set<string>());
};

export const applyEnforcedOnFields = (
    settings: TenantSettings | Record<string, unknown> | undefined,
    enforcedOnFields: Set<string>,
) => {
    if (enforcedOnFields.size === 0) return settings;

    const nextSettings = { ...(settings ?? {}) } as Record<string, unknown>;
    enforcedOnFields.forEach((field) => {
        nextSettings[field] = true;
    });
    return nextSettings;
};

/**
 * Fields a lower role may not edit because an upper role has constrained them: the union of
 * forced-off (locked off) and enforced-on (locked on) fields. Both render as disabled. See ADR-013.
 */
export const getRestrictedFields = (
    allowedToggles?: PermissionToggleVisibility,
    enforcedToggles?: PermissionToggleVisibility,
): Set<string> => new Set<string>([...getForcedOffFields(allowedToggles), ...getEnforcedOnFields(enforcedToggles)]);

/**
 * Applies the effective upper-role constraints to a settings object: forced-off fields become
 * `false`, enforced-on fields become `true`. Enforced-on wins if a field is (mis)set as both.
 */
export const applyPermissionConstraintsToSettings = (
    settings: TenantSettings | Record<string, unknown> | undefined,
    allowedToggles?: PermissionToggleVisibility,
    enforcedToggles?: PermissionToggleVisibility,
) =>
    applyEnforcedOnFields(
        applyForcedOffFields(settings, getForcedOffFields(allowedToggles)),
        getEnforcedOnFields(enforcedToggles),
    );

/** Maps allowedPermissionToggles to feature settings for super-admin display and persist. */
export const applyVisibleTogglesAsValues = (visibleToggles?: PermissionToggleVisibility) => {
    const settings: Record<string, boolean> = { ...DEFAULT_PERMISSION_SETTINGS };
    if (!visibleToggles) {
        return settings;
    }

    (Object.entries(PLATFORM_TOGGLE_FIELDS) as [keyof PermissionToggleVisibility, string[]][]).forEach(
        ([toggleKey, fields]) => {
            if (visibleToggles[toggleKey] === undefined) {
                return;
            }

            const enabled = visibleToggles[toggleKey] !== false;
            fields.forEach((field) => {
                settings[field] = enabled;
            });
        },
    );

    return settings;
};

/**
 * The platform preset as concrete feature values: the initial preset, overridden by the legacy
 * allowed toggles, overridden by the stored per-feature platform policies. Used by the platform
 * view so a stored policy (e.g. group chats off) is never contradicted by the hard-coded seed.
 */
export const platformPresetValues = (controls?: {
    allowedPermissionToggles?: PermissionToggleVisibility;
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
}) => {
    const settings = applyVisibleTogglesAsValues(controls?.allowedPermissionToggles);
    Object.entries(controls?.permissionPolicies ?? {}).forEach(([fieldKey, policy]) => {
        if (typeof policy?.value === 'boolean') {
            settings[fieldKey] = policy.value;
        }
    });
    return settings;
};

export const syncMasterTogglesToTenantAdminControls = (formData: { settings?: Record<string, unknown> }) => {
    const settings: Record<string, unknown> = { ...(formData?.settings ?? {}) };
    const next = { ...formData, settings };
    const isEnabled = (key: string) => settings[key] !== false;
    const existingTenantAdminControls = (settings.tenantAdminControls as Record<string, unknown> | undefined) ?? {};

    // Each toggle mirrors its own feature flag directly — no master-gating (which silently reset a
    // sub-feature to false when its card master was off: the "toggle springt zurück" bug).
    const allowedPermissionToggles = Object.fromEntries(
        (Object.entries(TOGGLE_KEY_TO_FIELD) as [keyof PermissionToggleVisibility, string][]).map(([key, field]) => [
            key,
            isEnabled(field),
        ]),
    );

    settings.tenantAdminControls = {
        ...existingTenantAdminControls,
        allowedPermissionToggles,
    };
    return next;
};

const FIELD_TO_TOGGLE_KEY: Record<string, keyof PermissionToggleVisibility> = Object.fromEntries(
    Object.entries(TOGGLE_KEY_TO_FIELD).map(([key, field]) => [field, key as keyof PermissionToggleVisibility]),
);

/**
 * Reverse of {@link TOGGLE_KEY_TO_FIELD}: turns the set of enforced settings-field keys the enforce
 * checkboxes produce into toggle-keyed enforcement flags (`{ videoCallsOneOnOneChats: true }`) for
 * persistence as `enforcedPermissionToggles`.
 */
export const enforcedFieldsToToggles = (enforcedFields: Set<string>): PermissionToggleVisibility =>
    Array.from(enforcedFields).reduce<PermissionToggleVisibility>((toggles, field) => {
        const key = FIELD_TO_TOGGLE_KEY[field];
        return key ? { ...toggles, [key]: true } : toggles;
    }, {});

export const buildTenantAdminControlsPayload = (
    formData: { settings?: Record<string, unknown> },
    existingToggles?: PermissionToggleVisibility,
    permissionsPageEnabled = true,
    enforcedToggles?: PermissionToggleVisibility,
): TenantAdminControls => {
    const synced = syncMasterTogglesToTenantAdminControls(formData);
    const syncedControls = synced.settings?.tenantAdminControls as TenantAdminControls | undefined;

    return {
        permissionsPageEnabled,
        allowedPermissionToggles: {
            ...existingToggles,
            ...syncedControls?.allowedPermissionToggles,
        },
        ...(enforcedToggles ? { enforcedPermissionToggles: enforcedToggles } : {}),
    };
};

export const isSubToggleDisabled = (card: ChatTypeCardDef, toggleField: string[], masterEnabled: boolean): boolean => {
    const fieldKey = toggleField[1];
    if (card.key === 'oneOnOne' && ONE_ON_ONE_CALL_TOGGLE_FIELDS.has(fieldKey)) {
        return !masterEnabled;
    }
    if (card.masterField) {
        return !masterEnabled;
    }
    return false;
};
