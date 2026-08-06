import { ReactComponent as OneOnOneIcon } from '../../../../resources/img/svg/permissions/one_on_one.svg';
import { ReactComponent as LiveChatIcon } from '../../../../resources/img/svg/permissions/live_chat.svg';
import { ReactComponent as GroupIcon } from '../../../../resources/img/svg/permissions/group.svg';
import { ReactComponent as GroupInternalIcon } from '../../../../resources/img/svg/permissions/group_internal.svg';
import type { ChatTypeCardDef } from './types';

export const CHAT_TYPE_CARDS: ChatTypeCardDef[] = [
    {
        key: 'oneOnOne',
        titleKey: 'tenants.permissions.card.oneOnOne.title',
        descriptionKey: 'tenants.permissions.card.oneOnOne.description',
        Icon: OneOnOneIcon,
        masterField: ['settings', 'featureCallsEnabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsOneOnOneEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.supervision',
                field: ['settings', 'featureSupervisionOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaUpload',
                field: ['settings', 'featureMediaUploadOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplayOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanOneOnOneChatsEnabled'],
            },
        ],
    },
    {
        key: 'liveChat',
        titleKey: 'tenants.permissions.card.liveChat.title',
        descriptionKey: 'tenants.permissions.card.liveChat.description',
        Icon: LiveChatIcon,
        masterField: ['settings', 'featureAnonymousChatEnabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.supervision',
                field: ['settings', 'featureSupervisionAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaUpload',
                field: ['settings', 'featureMediaUploadAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplayAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanAnonymousChatsEnabled'],
            },
        ],
    },
    {
        key: 'group',
        titleKey: 'tenants.permissions.card.group.title',
        descriptionKey: 'tenants.permissions.card.group.description',
        Icon: GroupIcon,
        masterField: ['settings', 'featureGroupChatV2Enabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaUpload',
                field: ['settings', 'featureMediaUploadGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplayGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanGroupChatsEnabled'],
            },
        ],
    },
    {
        key: 'groupInternal',
        titleKey: 'tenants.permissions.card.groupInternal.title',
        descriptionKey: 'tenants.permissions.card.groupInternal.description',
        Icon: GroupInternalIcon,
        masterField: ['settings', 'featureSupervisionEnabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaUpload',
                field: ['settings', 'featureMediaUploadSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplaySupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanSupervisionChatsEnabled'],
            },
        ],
    },
];

export const MASTER_TOGGLE_CHILDREN: Record<string, string[]> = CHAT_TYPE_CARDS.reduce((acc, card) => {
    if (!card.masterField) {
        return acc;
    }

    const masterKey = card.masterField[1];
    acc[masterKey] = card.toggles.map((toggle) => toggle.field[1]);
    return acc;
}, {} as Record<string, string[]>);
