import { AgencyAdminControls } from './AgencyAdminControls';

export type AgencyFeatureSettings = {
    featureAnonymousChatEnabled?: boolean;
    featureGroupChatV2Enabled?: boolean;
    featureCallsEnabled?: boolean;
    featureSupervisionEnabled?: boolean;
    featureSupervisionAnonymousChatsEnabled?: boolean;
    featureSupervisionOneOnOneChatsEnabled?: boolean;
    featureAudioCallsEnabled?: boolean;
    featureAudioCallsAnonymousChatsEnabled?: boolean;
    featureAudioCallsOneOnOneChatsEnabled?: boolean;
    featureAudioCallsGroupChatsEnabled?: boolean;
    featureAudioCallsSupervisionChatsEnabled?: boolean;
    featureVideoCallsEnabled?: boolean;
    featureVideoCallsAnonymousChatsEnabled?: boolean;
    featureVideoCallsOneOnOneChatsEnabled?: boolean;
    featureVideoCallsGroupChatsEnabled?: boolean;
    featureVideoCallsSupervisionChatsEnabled?: boolean;
    featureThreadsEnabled?: boolean;
    featureThreadsAnonymousChatsEnabled?: boolean;
    featureThreadsGroupChatsEnabled?: boolean;
    featureThreadsOneOnOneEnabled?: boolean;
    featureThreadsSupervisionChatsEnabled?: boolean;
    featureVoiceMessagesEnabled?: boolean;
    featureVoiceMessagesAnonymousChatsEnabled?: boolean;
    featureVoiceMessagesOneOnOneChatsEnabled?: boolean;
    featureVoiceMessagesGroupChatsEnabled?: boolean;
    featureVoiceMessagesSupervisionChatsEnabled?: boolean;
    agencyAdminControls?: AgencyAdminControls;
};

export type AgencyPermissionSettings = {
    settings?: AgencyFeatureSettings;
};
