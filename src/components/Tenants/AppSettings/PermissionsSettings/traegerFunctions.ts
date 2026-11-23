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
 * Team-Chat (the counsellors' side chat on an open enquiry, ORISO-Frontend#2491): governed exactly like
 * supervision — the master and what the side chat offers are permission policies on platform, Träger and
 * Beratungsstelle (TenantService#405, AgencyService#389).
 */
export const TEAM_CHAT_MASTER = 'featureTeamDiscussionEnabled';

/**
 * Frank, 2026-11-23: whether the team chat of a case stays open after the enquiry is accepted. Off by
 * default: it closes at acceptance and the history stays read-only. Only works while the master is on.
 */
export const TEAM_CHAT_AFTER_ACCEPT = 'featureTeamDiscussionAfterAcceptEnabled';

export const TEAM_CHAT_FEATURES: ChatFeature[] = [
    { labelKey: 'tenants.permissions.feature.videoCalls', field: 'featureVideoCallsTeamDiscussionsEnabled' },
    { labelKey: 'tenants.permissions.feature.audioCalls', field: 'featureAudioCallsTeamDiscussionsEnabled' },
    {
        labelKey: 'tenants.permissions.feature.voiceMessages',
        field: 'featureVoiceMessagesTeamDiscussionsEnabled',
        appOnly: true,
    },
    { labelKey: 'tenants.permissions.feature.threads', field: 'featureThreadsTeamDiscussionsEnabled' },
    {
        labelKey: 'tenants.permissions.feature.mediaUpload',
        field: 'featureMediaUploadTeamDiscussionsEnabled',
        appOnly: true,
    },
    {
        labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
        field: 'featureMediaInlineDisplayTeamDiscussionsEnabled',
    },
    {
        labelKey: 'tenants.permissions.feature.mediaAiScan',
        field: 'featureMediaAiScanTeamDiscussionsEnabled',
        requiresCapability: 'mediaAiScan',
    },
];
