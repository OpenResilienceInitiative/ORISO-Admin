import type { TileHelpTopic } from '../../../TileHelp';
import type { ChatTypeCardKey } from './types';
import { caseHandoverHelp, circleHelp, internalHelp, liveChatHelp, oneOnOneHelp, askerAccountHelp } from './help';

const switchedOff = (key: string) => ({
    id: 'switchedOff',
    titleKey: 'tileHelp.permissions.switchedOffTitle',
    bodyKey: `tileHelp.permissions.${key}.switchedOff`,
});

const emailSlide = {
    id: 'email',
    titleKey: 'tileHelp.permissions.emailTitle',
    bodyKey: 'tileHelp.permissions.emailBody',
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
        },
        emailSlide,
    ]),
    liveChat: conversationTopic('liveChat', [
        ...liveChatHelp.slides.filter(({ id }) => id !== 'notify'),
        {
            id: 'links',
            titleKey: 'liveChatLinks.title',
            bodyKey: 'tileHelp.permissions.liveChat.links',
        },
        {
            id: 'noEmail',
            titleKey: 'tileHelp.permissions.emailTitle',
            bodyKey: 'tileHelp.permissions.liveChat.noEmail',
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
        },
    ],
};

export const CASE_HANDOVER_HELP: TileHelpTopic = {
    ...caseHandoverHelp,
    id: 'caseHandover',
    titleKey: 'tenants.permissions.card.caseHandover.title',
    essenceKey: 'tenants.permissions.card.caseHandover.description',
};
