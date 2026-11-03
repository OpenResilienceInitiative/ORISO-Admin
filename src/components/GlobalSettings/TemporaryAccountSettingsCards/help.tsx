import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import guestPicture from '../../../resources/img/tile-help/guest.webp';
import messagesPicture from '../../../resources/img/tile-help/messages.webp';

export const guestAccountsHelp: TileHelpTopic = {
    id: 'guestAccounts',
    titleKey: 'globalSettings.temporaryAccounts.title',
    essenceKey: 'tileHelp.guestAccounts.essence',
    slides: [
        {
            id: 'created',
            titleKey: 'tileHelp.guestAccounts.created.title',
            bodyKey: 'tileHelp.guestAccounts.created.body',
            visual: <TilePicture src={guestPicture} />,
        },
        { id: 'call', titleKey: 'tileHelp.guestAccounts.call.title', bodyKey: 'tileHelp.guestAccounts.call.body' },
        { id: 'chat', titleKey: 'tileHelp.guestAccounts.chat.title', bodyKey: 'tileHelp.guestAccounts.chat.body' },
        {
            id: 'password',
            titleKey: 'tileHelp.guestAccounts.password.title',
            bodyKey: 'tileHelp.guestAccounts.password.body',
        },
    ],
};

export const temporaryMessagesHelp: TileHelpTopic = {
    id: 'temporaryMessages',
    titleKey: 'globalSettings.temporaryMessages.title',
    essenceKey: 'tileHelp.temporaryMessages.essence',
    slides: [
        {
            id: 'temporary',
            titleKey: 'tileHelp.temporaryMessages.temporary.title',
            bodyKey: 'tileHelp.temporaryMessages.temporary.body',
            visual: <TilePicture src={messagesPicture} />,
        },
        {
            id: 'decides',
            titleKey: 'tileHelp.temporaryMessages.decides.title',
            bodyKey: 'tileHelp.temporaryMessages.decides.body',
        },
        {
            id: 'kept',
            titleKey: 'tileHelp.temporaryMessages.kept.title',
            bodyKey: 'tileHelp.temporaryMessages.kept.body',
        },
    ],
};
