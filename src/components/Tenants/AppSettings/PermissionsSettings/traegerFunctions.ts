import type { PermissionToggleCapability } from './types';

/**
 * ORISO-Admin#1577: functions from the former "Funktionalitäten" tab (now "Weitere") that moved into
 * Funktionszugriff.
 */

/** Supervision chats: the master and what the supervision chat itself offers (ORISO-Admin#988). */
export const SUPERVISION_MASTER = 'featureSupervisionEnabled';

export const SUPERVISION_FEATURES: Array<{
    labelKey: string;
    field: string;
    requiresCapability?: PermissionToggleCapability;
    appOnly?: boolean;
}> = [
    { labelKey: 'tenants.permissions.feature.videoCalls', field: 'featureVideoCallsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.audioCalls', field: 'featureAudioCallsSupervisionChatsEnabled' },
    {
        labelKey: 'tenants.permissions.feature.voiceMessages',
        field: 'featureVoiceMessagesSupervisionChatsEnabled',
        appOnly: true,
    },
    { labelKey: 'tenants.permissions.feature.threads', field: 'featureThreadsSupervisionChatsEnabled' },
    {
        labelKey: 'tenants.permissions.feature.mediaUpload',
        field: 'featureMediaUploadSupervisionChatsEnabled',
        appOnly: true,
    },
    {
        labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
        field: 'featureMediaInlineDisplaySupervisionChatsEnabled',
    },
    {
        labelKey: 'tenants.permissions.feature.mediaAiScan',
        field: 'featureMediaAiScanSupervisionChatsEnabled',
        requiresCapability: 'mediaAiScan',
    },
];

/**
 * Settings TenantService stores per Träger only, as plain values: no policy, no platform preset and
 * no value of a Beratungsstelle. The platform page says they are set per Träger; a centre shows its
 * Träger's value read-only. Today: Team-Chat on the Mail Beratung tile.
 */
export const TRAEGER_ONLY_SETTINGS = {
    teamChat: 'featureTeamDiscussionEnabled',
} as const;

export type TraegerOnlySetting = (typeof TRAEGER_ONLY_SETTINGS)[keyof typeof TRAEGER_ONLY_SETTINGS];

export type TraegerOnlySettings = {
    /** `own`: this page edits them (Träger); `traeger`: read-only from the centre's Träger; `none`: platform. */
    source: 'own' | 'traeger' | 'none';
    values?: Partial<Record<TraegerOnlySetting, boolean | null>>;
    /** Read state of `values` (centre page). */
    status?: 'pending' | 'error' | 'success';
    pendingFields?: ReadonlySet<string>;
    onChange?: (field: TraegerOnlySetting, value: boolean) => void;
};
