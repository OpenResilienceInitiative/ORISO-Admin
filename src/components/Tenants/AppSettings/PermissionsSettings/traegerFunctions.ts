import type { ChatFeature } from './ChatFeaturesDialog';

/**
 * ORISO-Admin#1577: functions from the former "Funktionalitäten" tab (now "Weitere") that moved into
 * Funktionszugriff.
 */

/** Supervision chats: the master and what the supervision chat itself offers (ORISO-Admin#988). */
export const SUPERVISION_MASTER = 'featureSupervisionEnabled';

export const SUPERVISION_FEATURES: ChatFeature[] = [
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
 * What the Team-Chat (the counsellors' side chat on an open enquiry) offers, configured like the supervision
 * chat (Frank, 2026-11-20). TenantService has none of these settings yet: only the master
 * `featureTeamDiscussionEnabled` exists. The names mirror the supervision fields and are the proposal for the
 * backend follow-up; until a field is stored there it stays `stored: false`, and the dialog names the feature
 * without offering a switch, so no choice is shown as saved that the server would drop.
 */
export const TEAM_CHAT_FEATURES: ChatFeature[] = [
    {
        labelKey: 'tenants.permissions.feature.videoCalls',
        field: 'featureVideoCallsTeamDiscussionsEnabled',
        stored: false,
    },
    {
        labelKey: 'tenants.permissions.feature.audioCalls',
        field: 'featureAudioCallsTeamDiscussionsEnabled',
        stored: false,
    },
    {
        labelKey: 'tenants.permissions.feature.voiceMessages',
        field: 'featureVoiceMessagesTeamDiscussionsEnabled',
        appOnly: true,
        stored: false,
    },
    { labelKey: 'tenants.permissions.feature.threads', field: 'featureThreadsTeamDiscussionsEnabled', stored: false },
    {
        labelKey: 'tenants.permissions.feature.mediaUpload',
        field: 'featureMediaUploadTeamDiscussionsEnabled',
        appOnly: true,
        stored: false,
    },
    {
        labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
        field: 'featureMediaInlineDisplayTeamDiscussionsEnabled',
        stored: false,
    },
    {
        labelKey: 'tenants.permissions.feature.mediaAiScan',
        field: 'featureMediaAiScanTeamDiscussionsEnabled',
        requiresCapability: 'mediaAiScan',
        stored: false,
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
