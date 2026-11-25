import { ReactComponent as OneOnOneIcon } from '../../../../resources/img/svg/permissions/one_on_one.svg';
import { ReactComponent as LiveChatIcon } from '../../../../resources/img/svg/permissions/live_chat.svg';
import { ReactComponent as GroupIcon } from '../../../../resources/img/svg/permissions/group.svg';
import { ReactComponent as GroupInternalIcon } from '../../../../resources/img/svg/permissions/group_internal.svg';
import type { ChatTypeCardDef, ChatTypeParticipantToggle } from './types';

/** Said once per tile whose switches only the app obeys (ORISO-Helm#466). */
export const APP_ONLY_HINT_KEY = 'tenants.permissions.feature.appOnlyHint';

const askerNamePolicy = (setting: string): ChatTypeParticipantToggle => ({
    setting,
    labelKey: 'tenants.permissions.asker.displayName.conversationLabel',
    requiresAskerNameEditing: true,
});

export const CHAT_TYPE_CARDS: ChatTypeCardDef[] = [
    {
        key: 'oneOnOne',
        askerNamePolicy: askerNamePolicy('featureDisplayNameEditableAgencyCounsellingEnabled'),
        titleKey: 'tenants.permissions.card.oneOnOne.title',
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
                appOnly: true,
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
                appOnly: true,
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplayOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanOneOnOneChatsEnabled'],
                requiresCapability: 'mediaAiScan',
            },
        ],
        notifications: {
            audience: 'asker',
            toggles: [
                {
                    labelKey: 'tenants.permissions.card.notifications.askForEmail',
                    setting: 'featureAskerEmailCollectionAgencyCounsellingEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.collection.agencyCounselling',
                    requiresAskerEmail: true,
                    worksWithDelivery: 'featureAskerEmailAgencyCounsellingEnabled',
                },
                {
                    labelKey: 'tenants.permissions.card.notifications.email',
                    setting: 'featureAskerEmailAgencyCounsellingEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.channels.emailAgencyCounselling',
                },
                {
                    labelKey: 'tenants.permissions.card.notifications.browser',
                    setting: 'featureAskerBrowserAgencyCounsellingEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.channels.browserAgencyCounselling',
                },
            ],
        },
    },
    {
        key: 'liveChat',
        askerNamePolicy: askerNamePolicy('featureDisplayNameEditableLiveChatEnabled'),
        titleKey: 'tenants.permissions.card.liveChat.title',
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
                appOnly: true,
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
                appOnly: true,
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplayAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanAnonymousChatsEnabled'],
                requiresCapability: 'mediaAiScan',
            },
        ],
        // Frank 2026-11-03: live chat stays temporary and anonymous for now, so it has no address to
        // ask for or to mail to. E-mail switches return here once a permanent account path exists.
        notifications: {
            audience: 'asker',
            toggles: [
                {
                    labelKey: 'tenants.permissions.card.notifications.browser',
                    setting: 'featureAskerBrowserLiveChatEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.channels.browserLiveChat',
                },
            ],
        },
    },
    {
        key: 'group',
        askerNamePolicy: askerNamePolicy('featureDisplayNameEditableSelfHelpEnabled'),
        titleKey: 'tenants.permissions.card.group.title',
        Icon: GroupIcon,
        // ORISO-Admin#988 / Frank 2026-09-16: this card is the conversation-circle format
        // ("Gesprächskreis", advice seekers + counsellors) — its own switch, not the old
        // "both group formats" master. Internal group chats are the separate `groupInternal`
        // card below. The sub-toggles are unchanged: they gate features inside any group chat.
        masterField: ['settings', 'featureSelfHelpGroupsEnabled'],
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
                appOnly: true,
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaUpload',
                field: ['settings', 'featureMediaUploadGroupChatsEnabled'],
                appOnly: true,
            },
            {
                labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
                field: ['settings', 'featureMediaInlineDisplayGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.mediaAiScan',
                field: ['settings', 'featureMediaAiScanGroupChatsEnabled'],
                requiresCapability: 'mediaAiScan',
            },
        ],
        notifications: {
            audience: 'asker',
            toggles: [
                {
                    labelKey: 'tenants.permissions.card.notifications.askForEmail',
                    setting: 'featureAskerEmailCollectionSelfHelpEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.collection.selfHelp',
                    requiresAskerEmail: true,
                    worksWithDelivery: 'featureAskerEmailSelfHelpEnabled',
                },
                {
                    labelKey: 'tenants.permissions.card.notifications.email',
                    setting: 'featureAskerEmailSelfHelpEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.channels.emailSelfHelp',
                },
                {
                    labelKey: 'tenants.permissions.card.notifications.browser',
                    setting: 'featureAskerBrowserSelfHelpEnabled',
                    fallbackLabelKey: 'tenants.permissions.asker.channels.browserSelfHelp',
                },
            ],
        },
    },
    {
        key: 'groupInternal',
        titleKey: 'tenants.permissions.card.groupInternal.title',
        Icon: GroupInternalIcon,
        // ORISO-Admin#988 / Frank 2026-09-16: internal group chats (counsellors only) are their
        // own conversation type, switched independently of the conversation-circle `group` card.
        masterField: ['settings', 'featureInternalGroupChatEnabled'],
        // No feature sub-toggles yet: internal group chats have no own feature-field family (no
        // featureXInternalGroupChatEnabled fields exist in the backend today), so there is nothing
        // to render here. This card carries no supervision toggle: supervision applies to Mail
        // Beratung and Live Chat only (Frank, 2026-11-19). The supervision master and what the
        // supervision chat itself offers live on the Supervision tile after the conversation types
        // (SupervisionTile, ORISO-Admin#1577; ORISO-Admin#991 for the earlier wrong wiring here).
        toggles: [],
        // FE#1725 stories 39/40: counsellor-side channels for internal group chats (ADR-024
        // addendum 2026-10-07). TenantService PermissionFeature + Settings, default true.
        notifications: {
            audience: 'consultant',
            toggles: [
                {
                    labelKey: 'tenants.permissions.card.notifications.email',
                    setting: 'featureConsultantEmailInternalGroupEnabled',
                },
                {
                    labelKey: 'tenants.permissions.card.notifications.browser',
                    setting: 'featureConsultantBrowserInternalGroupEnabled',
                    // No browser-event producer for group members yet (T7): open product question.
                    notYetEffective: true,
                },
            ],
        },
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
