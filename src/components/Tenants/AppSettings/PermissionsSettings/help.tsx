import { TilePicture } from '../../../TileFill';
import type { TileHelpTopic } from '../../../TileHelp';
import type { ChatTypeCardKey } from './types';
import seekerAccountPicture from '../../../../resources/img/tile-help/seeker-account.webp';
import handoverPicture from '../../../../resources/img/tile-help/handover.webp';
import conversationPicture from '../../../../resources/img/tile-help/conversation.webp';
import liveChatPicture from '../../../../resources/img/tile-help/live-chat.webp';
import circlePicture from '../../../../resources/img/tile-help/circle.webp';
import internalPicture from '../../../../resources/img/tile-help/internal.webp';
import invitePicture from '../../../../resources/img/tile-help/invite.webp';
import permissionsLevelsModesPicture from '../../../../resources/img/tile-help/permissions/levels-modes.webp';
import permissionsLevelsTraegerPicture from '../../../../resources/img/tile-help/permissions/levels-traeger.webp';
import permissionsLevelsCentrePicture from '../../../../resources/img/tile-help/permissions/levels-centre.webp';
import permissionsAskerEmailPicture from '../../../../resources/img/tile-help/permissions/asker-email.webp';
import permissionsAskerChannelsPicture from '../../../../resources/img/tile-help/permissions/asker-channels.webp';
import permissionsHandoverReasonsPicture from '../../../../resources/img/tile-help/permissions/handover-reasons.webp';
import permissionsHandoverConsentPicture from '../../../../resources/img/tile-help/permissions/handover-consent.webp';
import permissionsHandoverMessagePicture from '../../../../resources/img/tile-help/permissions/handover-message.webp';
import permissionsOneononeFeaturesPicture from '../../../../resources/img/tile-help/permissions/oneonone-features.webp';
import permissionsOneononeNotifyPicture from '../../../../resources/img/tile-help/permissions/oneonone-notify.webp';
import permissionsLivechatFeaturesPicture from '../../../../resources/img/tile-help/permissions/livechat-features.webp';
import permissionsLivechatNotifyPicture from '../../../../resources/img/tile-help/permissions/livechat-notify.webp';
import permissionsCircleJoinPicture from '../../../../resources/img/tile-help/permissions/circle-join.webp';
import permissionsCircleRolesPicture from '../../../../resources/img/tile-help/permissions/circle-roles.webp';
import permissionsInternalPlatformPicture from '../../../../resources/img/tile-help/permissions/internal-platform.webp';
import permissionsInternalNotifyPicture from '../../../../resources/img/tile-help/permissions/internal-notify.webp';
import permissionsInviteVisiblePicture from '../../../../resources/img/tile-help/permissions/invite-visible.webp';

export const permissionLevelsHelp: TileHelpTopic = {
    id: 'permissionLevels',
    titleKey: 'tileHelp.permissionLevels.title',
    essenceKey: 'tileHelp.permissionLevels.essence',
    slides: [
        {
            id: 'modes',
            titleKey: 'tileHelp.permissionLevels.modes.title',
            bodyKey: 'tileHelp.permissionLevels.modes.body',
            visual: <TilePicture src={permissionsLevelsModesPicture} />,
        },
        {
            id: 'traeger',
            titleKey: 'tileHelp.permissionLevels.traeger.title',
            bodyKey: 'tileHelp.permissionLevels.traeger.body',
            visual: <TilePicture src={permissionsLevelsTraegerPicture} />,
        },
        {
            id: 'centre',
            titleKey: 'tileHelp.permissionLevels.centre.title',
            bodyKey: 'tileHelp.permissionLevels.centre.body',
            visual: <TilePicture src={permissionsLevelsCentrePicture} />,
        },
    ],
};

export const askerAccountHelp: TileHelpTopic = {
    id: 'askerAccount',
    titleKey: 'tenants.permissions.asker.title',
    essenceKey: 'tileHelp.askerAccount.essence',
    slides: [
        {
            id: 'name',
            titleKey: 'tileHelp.askerAccount.name.title',
            bodyKey: 'tileHelp.askerAccount.name.body',
            visual: <TilePicture src={seekerAccountPicture} />,
        },
        {
            id: 'email',
            titleKey: 'tileHelp.askerAccount.email.title',
            bodyKey: 'tileHelp.askerAccount.email.body',
            visual: <TilePicture src={permissionsAskerEmailPicture} />,
        },
        {
            id: 'channels',
            titleKey: 'tileHelp.askerAccount.channels.title',
            bodyKey: 'tileHelp.askerAccount.channels.body',
            visual: <TilePicture src={permissionsAskerChannelsPicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const caseHandoverHelp: TileHelpTopic = {
    id: 'caseHandover',
    titleKey: 'tenants.permissions.card.caseHandover.title',
    essenceKey: 'tileHelp.caseHandover.essence',
    slides: [
        {
            id: 'who',
            titleKey: 'tileHelp.caseHandover.who.title',
            bodyKey: 'tileHelp.caseHandover.who.body',
            visual: <TilePicture src={handoverPicture} />,
        },
        {
            id: 'reasons',
            titleKey: 'tileHelp.caseHandover.reasons.title',
            bodyKey: 'tileHelp.caseHandover.reasons.body',
            visual: <TilePicture src={permissionsHandoverReasonsPicture} />,
        },
        {
            id: 'consent',
            titleKey: 'tileHelp.caseHandover.consent.title',
            bodyKey: 'tileHelp.caseHandover.consent.body',
            visual: <TilePicture src={permissionsHandoverConsentPicture} />,
        },
        {
            id: 'message',
            titleKey: 'tileHelp.caseHandover.message.title',
            bodyKey: 'tileHelp.caseHandover.message.body',
            visual: <TilePicture src={permissionsHandoverMessagePicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const oneOnOneHelp: TileHelpTopic = {
    id: 'oneOnOne',
    titleKey: 'tenants.permissions.card.oneOnOne.title',
    essenceKey: 'tileHelp.oneOnOne.essence',
    slides: [
        {
            id: 'master',
            titleKey: 'tileHelp.oneOnOne.master.title',
            bodyKey: 'tileHelp.oneOnOne.master.body',
            visual: <TilePicture src={conversationPicture} />,
        },
        {
            id: 'features',
            titleKey: 'tileHelp.oneOnOne.features.title',
            bodyKey: 'tileHelp.oneOnOne.features.body',
            visual: <TilePicture src={permissionsOneononeFeaturesPicture} />,
        },
        {
            id: 'notify',
            titleKey: 'tileHelp.oneOnOne.notify.title',
            bodyKey: 'tileHelp.oneOnOne.notify.body',
            visual: <TilePicture src={permissionsOneononeNotifyPicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const liveChatHelp: TileHelpTopic = {
    id: 'liveChat',
    titleKey: 'tenants.permissions.card.liveChat.title',
    essenceKey: 'tileHelp.liveChat.essence',
    slides: [
        {
            id: 'entry',
            titleKey: 'tileHelp.liveChat.entry.title',
            bodyKey: 'tileHelp.liveChat.entry.body',
            visual: <TilePicture src={liveChatPicture} />,
        },
        {
            id: 'features',
            titleKey: 'tileHelp.liveChat.features.title',
            bodyKey: 'tileHelp.liveChat.features.body',
            visual: <TilePicture src={permissionsLivechatFeaturesPicture} />,
        },
        {
            id: 'notify',
            titleKey: 'tileHelp.liveChat.notify.title',
            bodyKey: 'tileHelp.liveChat.notify.body',
            visual: <TilePicture src={permissionsLivechatNotifyPicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const circleHelp: TileHelpTopic = {
    id: 'circle',
    titleKey: 'tenants.permissions.card.group.title',
    essenceKey: 'tileHelp.circle.essence',
    slides: [
        {
            id: 'create',
            titleKey: 'tileHelp.circle.create.title',
            bodyKey: 'tileHelp.circle.create.body',
            visual: <TilePicture src={circlePicture} />,
        },
        {
            id: 'join',
            titleKey: 'tileHelp.circle.join.title',
            bodyKey: 'tileHelp.circle.join.body',
            visual: <TilePicture src={permissionsCircleJoinPicture} />,
        },
        {
            id: 'roles',
            titleKey: 'tileHelp.circle.roles.title',
            bodyKey: 'tileHelp.circle.roles.body',
            visual: <TilePicture src={permissionsCircleRolesPicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const internalHelp: TileHelpTopic = {
    id: 'internal',
    titleKey: 'tenants.permissions.card.groupInternal.title',
    essenceKey: 'tileHelp.internal.essence',
    slides: [
        {
            id: 'scope',
            titleKey: 'tileHelp.internal.scope.title',
            bodyKey: 'tileHelp.internal.scope.body',
            visual: <TilePicture src={internalPicture} />,
        },
        {
            id: 'platform',
            titleKey: 'tileHelp.internal.platform.title',
            bodyKey: 'tileHelp.internal.platform.body',
            visual: <TilePicture src={permissionsInternalPlatformPicture} />,
        },
        {
            id: 'notify',
            titleKey: 'tileHelp.internal.notify.title',
            bodyKey: 'tileHelp.internal.notify.body',
            visual: <TilePicture src={permissionsInternalNotifyPicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const directInviteHelp: TileHelpTopic = {
    id: 'directInvite',
    titleKey: 'tenants.permissions.directInvite.title',
    essenceKey: 'tileHelp.directInvite.essence',
    slides: [
        {
            id: 'levels',
            titleKey: 'tileHelp.directInvite.levels.title',
            bodyKey: 'tileHelp.directInvite.levels.body',
            visual: <TilePicture src={invitePicture} />,
        },
        {
            id: 'visible',
            titleKey: 'tileHelp.directInvite.visible.title',
            bodyKey: 'tileHelp.directInvite.visible.body',
            visual: <TilePicture src={permissionsInviteVisiblePicture} />,
        },
    ],
    related: [permissionLevelsHelp],
};

export const CHAT_TYPE_HELP: Record<ChatTypeCardKey, TileHelpTopic> = {
    oneOnOne: oneOnOneHelp,
    liveChat: liveChatHelp,
    group: circleHelp,
    groupInternal: internalHelp,
};
