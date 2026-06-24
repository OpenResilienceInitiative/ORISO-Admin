import { PermissionToggleVisibility } from '../../../../types/PermissionToggleVisibility';
import { TenantAdminControls } from '../../../../types/TenantAdminControls';
import type { ChatTypeCardDef } from './types';

export const DEFAULT_PERMISSION_SETTINGS = {
    featureAnonymousChatEnabled: true,
    featureGroupChatV2Enabled: true,
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
};

const ONE_ON_ONE_CALL_TOGGLE_FIELDS = new Set([
    'featureVideoCallsOneOnOneChatsEnabled',
    'featureAudioCallsOneOnOneChatsEnabled',
]);

export const getForcedOffFields = (toggles?: PermissionToggleVisibility) => {
    if (!toggles) return new Set<string>();

    return Object.entries(toggles).reduce((fields, [toggleKey, enabled]) => {
        if (enabled === false) {
            const platformFields = PLATFORM_TOGGLE_FIELDS[toggleKey as keyof PermissionToggleVisibility];
            if (platformFields) {
                platformFields.forEach((field) => fields.add(field));
                return fields;
            }
        }
        return fields;
    }, new Set<string>());
};

export const applyForcedOffFields = (
    settings: Record<string, unknown> | undefined,
    forcedOffFields: Set<string>,
) => {
    if (forcedOffFields.size === 0) return settings;

    const nextSettings = { ...(settings ?? {}) };
    forcedOffFields.forEach((field) => {
        nextSettings[field] = false;
    });
    return nextSettings;
};

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

export const syncMasterTogglesToTenantAdminControls = (formData: { settings?: Record<string, unknown> }) => {
    const next = { ...formData, settings: { ...(formData?.settings ?? {}) } };
    const { settings } = next;
    const isEnabled = (key: string) => settings?.[key] !== false;
    const anonymousEnabled = isEnabled('featureAnonymousChatEnabled');
    const groupEnabled = isEnabled('featureGroupChatV2Enabled');
    const oneOnOneEnabled = isEnabled('featureCallsEnabled');
    const supervisionEnabled = isEnabled('featureSupervisionEnabled');

    settings.tenantAdminControls = {
        ...(settings.tenantAdminControls ?? {}),
        allowedPermissionToggles: {
            anonymousChat: anonymousEnabled,
            groupChat: groupEnabled,
            calls: oneOnOneEnabled,
            supervision: supervisionEnabled,
            supervisionAnonymousChats: anonymousEnabled && isEnabled('featureSupervisionAnonymousChatsEnabled'),
            supervisionOneOnOneChats: oneOnOneEnabled && isEnabled('featureSupervisionOneOnOneChatsEnabled'),
            audioCalls: isEnabled('featureAudioCallsEnabled'),
            audioCallsAnonymousChats: anonymousEnabled && isEnabled('featureAudioCallsAnonymousChatsEnabled'),
            audioCallsOneOnOneChats: oneOnOneEnabled && isEnabled('featureAudioCallsOneOnOneChatsEnabled'),
            audioCallsGroupChats: groupEnabled && isEnabled('featureAudioCallsGroupChatsEnabled'),
            audioCallsSupervisionChats: isEnabled('featureAudioCallsSupervisionChatsEnabled'),
            videoCalls: isEnabled('featureVideoCallsEnabled'),
            videoCallsAnonymousChats: anonymousEnabled && isEnabled('featureVideoCallsAnonymousChatsEnabled'),
            videoCallsOneOnOneChats: oneOnOneEnabled && isEnabled('featureVideoCallsOneOnOneChatsEnabled'),
            videoCallsGroupChats: groupEnabled && isEnabled('featureVideoCallsGroupChatsEnabled'),
            videoCallsSupervisionChats: supervisionEnabled && isEnabled('featureVideoCallsSupervisionChatsEnabled'),
            threads: isEnabled('featureThreadsEnabled'),
            threadsAnonymousChats: anonymousEnabled && isEnabled('featureThreadsAnonymousChatsEnabled'),
            threadsOneOnOneChats: oneOnOneEnabled && isEnabled('featureThreadsOneOnOneEnabled'),
            threadsGroupChats: groupEnabled && isEnabled('featureThreadsGroupChatsEnabled'),
            threadsSupervisionChats: supervisionEnabled && isEnabled('featureThreadsSupervisionChatsEnabled'),
            voiceMessages: isEnabled('featureVoiceMessagesEnabled'),
            voiceMessagesAnonymousChats: anonymousEnabled && isEnabled('featureVoiceMessagesAnonymousChatsEnabled'),
            voiceMessagesOneOnOneChats: oneOnOneEnabled && isEnabled('featureVoiceMessagesOneOnOneChatsEnabled'),
            voiceMessagesGroupChats: groupEnabled && isEnabled('featureVoiceMessagesGroupChatsEnabled'),
            voiceMessagesSupervisionChats:
                supervisionEnabled && isEnabled('featureVoiceMessagesSupervisionChatsEnabled'),
        },
    };
    return next;
};

export const buildTenantAdminControlsPayload = (
    formData: { settings?: Record<string, unknown> },
    existingToggles?: PermissionToggleVisibility,
    permissionsPageEnabled = true,
): TenantAdminControls => {
    const synced = syncMasterTogglesToTenantAdminControls(formData);
    const syncedControls = synced.settings?.tenantAdminControls as TenantAdminControls | undefined;

    return {
        permissionsPageEnabled,
        allowedPermissionToggles: {
            ...existingToggles,
            ...syncedControls?.allowedPermissionToggles,
        },
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
