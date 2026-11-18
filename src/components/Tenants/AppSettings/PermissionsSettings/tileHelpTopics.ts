import { createElement } from 'react';
import { TilePicture } from '../../../TileFill';
import type { TileHelpTopic } from '../../../TileHelp';
import type { ChatTypeCardKey } from './types';
import { runtimeConfig } from '../../../../config/runtimeConfig';
import {
    askerAccountHelp,
    caseHandoverHelp,
    circleHelp,
    directInviteHelp,
    internalHelp,
    liveChatHelp,
    oneOnOneHelp,
} from './help';
import emailPicture from '../../../../resources/img/tile-help/permissions/email.webp';
import liveChatLinksPicture from '../../../../resources/img/tile-help/permissions/livechat-links.webp';
import liveChatNoEmailPicture from '../../../../resources/img/tile-help/permissions/livechat-noemail.webp';
import switchedOffGroupPicture from '../../../../resources/img/tile-help/permissions/switched-off-group.webp';
import switchedOffGroupInternalPicture from '../../../../resources/img/tile-help/permissions/switched-off-groupinternal.webp';
import switchedOffLiveChatPicture from '../../../../resources/img/tile-help/permissions/switched-off-livechat.webp';
import switchedOffOneOnOnePicture from '../../../../resources/img/tile-help/permissions/switched-off-oneonone.webp';

const SWITCHED_OFF_PICTURE: Record<ChatTypeCardKey, string> = {
    oneOnOne: switchedOffOneOnOnePicture,
    liveChat: switchedOffLiveChatPicture,
    group: switchedOffGroupPicture,
    groupInternal: switchedOffGroupInternalPicture,
};

const picture = (src: string) => createElement(TilePicture, { src });

const switchedOff = (key: ChatTypeCardKey) => ({
    id: 'switchedOff',
    titleKey: 'tileHelp.permissions.switchedOffTitle',
    bodyKey: `tileHelp.permissions.${key}.switchedOff`,
    visual: picture(SWITCHED_OFF_PICTURE[key]),
});

const emailSlide = {
    id: 'email',
    titleKey: 'tileHelp.permissions.emailTitle',
    bodyKey: 'tileHelp.permissions.emailBody',
    visual: picture(emailPicture),
};

const conversationTopic = (key: ChatTypeCardKey, extraSlides: TileHelpTopic['slides'] = []): TileHelpTopic => ({
    id: key,
    titleKey: `tenants.permissions.card.${key}.title`,
    essenceKey: `tileHelp.permissions.${key}.essence`,
    slides: [switchedOff(key), ...extraSlides],
});

/** The explanation behind the info button of each conversation-type tile. */
export const CONVERSATION_HELP: Record<ChatTypeCardKey, TileHelpTopic> = {
    oneOnOne: conversationTopic('oneOnOne', [
        ...oneOnOneHelp.slides,
        {
            id: 'directInvite',
            titleKey: 'tenants.permissions.directInvite.title',
            bodyKey: 'tenants.permissions.directInvite.description',
            visual: directInviteHelp.slides[0].visual,
        },
        emailSlide,
    ]),
    liveChat: conversationTopic('liveChat', [
        ...liveChatHelp.slides.filter(({ id }) => id !== 'notify'),
        {
            id: 'links',
            titleKey: 'liveChatLinks.title',
            bodyKey: 'tileHelp.permissions.liveChat.links',
            visual: picture(liveChatLinksPicture),
        },
        {
            id: 'noEmail',
            titleKey: 'tileHelp.permissions.emailTitle',
            bodyKey: 'tileHelp.permissions.liveChat.noEmail',
            visual: picture(liveChatNoEmailPicture),
        },
    ]),
    group: conversationTopic('group', [...circleHelp.slides, emailSlide]),
    groupInternal: conversationTopic('groupInternal', internalHelp.slides),
};

export const ASKER_HELP: TileHelpTopic = {
    ...askerAccountHelp,
    id: 'asker',
    titleKey: 'tenants.permissions.asker.title',
    essenceKey: 'tenants.permissions.asker.description',
    slides: [
        {
            id: 'displayName',
            titleKey: 'tenants.permissions.asker.displayName.label',
            bodyKey: 'tenants.permissions.asker.displayName.description',
            visual: askerAccountHelp.slides[0].visual,
        },
        {
            id: 'email',
            titleKey: 'tenants.permissions.asker.email.label',
            bodyKey: 'tenants.permissions.asker.email.description',
            visual: askerAccountHelp.slides[1].visual,
        },
    ],
};

export const CASE_HANDOVER_HELP: TileHelpTopic = {
    ...caseHandoverHelp,
    id: 'caseHandover',
    titleKey: 'tenants.permissions.card.caseHandover.title',
    essenceKey: 'tenants.permissions.card.caseHandover.description',
};

/** Feature pages on ORISO Understand (`UNDERSTAND_URL`); a section links its page once one exists (#1558). */
const FEATURE_PAGE_PATHS = {
    caseHandover: 'features/case-handover.html',
} as const;

/** Address of a feature page, or undefined where no Understand is configured. */
export const featurePage = (feature: keyof typeof FEATURE_PAGE_PATHS): string | undefined =>
    runtimeConfig.understandUrl ? `${runtimeConfig.understandUrl}/${FEATURE_PAGE_PATHS[feature]}` : undefined;

/**
 * "Gastkonten erlauben" (#1558, #1560). The pictures are still to be drawn in the house style
 * (prompts: docs/storybook/issue-1558-case-sharing/help-picture-prompts.md); until then the slides
 * show the placeholder.
 */
export const GUEST_ACCOUNT_HELP: TileHelpTopic = {
    id: 'guestAccounts',
    titleKey: 'tenants.permissions.guestAccountModes.title',
    essenceKey: 'tileHelp.guestAccounts.essence',
    slides: [
        {
            id: 'temporary',
            titleKey: 'tileHelp.guestAccounts.temporary.title',
            bodyKey: 'tileHelp.guestAccounts.temporary.body',
        },
        {
            id: 'guestChooses',
            titleKey: 'tileHelp.guestAccounts.guestChooses.title',
            bodyKey: 'tileHelp.guestAccounts.guestChooses.body',
        },
        {
            id: 'permanent',
            titleKey: 'tileHelp.guestAccounts.permanent.title',
            bodyKey: 'tileHelp.guestAccounts.permanent.body',
        },
    ],
};
