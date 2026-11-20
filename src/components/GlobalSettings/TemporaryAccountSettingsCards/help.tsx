import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import guestPicture from '../../../resources/img/tile-help/guest.webp';
import messagesPicture from '../../../resources/img/tile-help/messages.webp';
import guestAccountsCallPicture from '../../../resources/img/tile-help/guest-accounts/call.webp';
import guestAccountsChatPicture from '../../../resources/img/tile-help/guest-accounts/chat.webp';
import guestAccountsPasswordPicture from '../../../resources/img/tile-help/guest-accounts/password.webp';
import temporaryMessagesDecidesPicture from '../../../resources/img/tile-help/temporary-messages/decides.webp';
import temporaryMessagesKeptPicture from '../../../resources/img/tile-help/temporary-messages/kept.webp';

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
        {
            id: 'call',
            titleKey: 'tileHelp.guestAccounts.call.title',
            bodyKey: 'tileHelp.guestAccounts.call.body',
            visual: <TilePicture src={guestAccountsCallPicture} />,
        },
        {
            id: 'chat',
            titleKey: 'tileHelp.guestAccounts.chat.title',
            bodyKey: 'tileHelp.guestAccounts.chat.body',
            visual: <TilePicture src={guestAccountsChatPicture} />,
        },
        {
            id: 'password',
            titleKey: 'tileHelp.guestAccounts.password.title',
            bodyKey: 'tileHelp.guestAccounts.password.body',
            visual: <TilePicture src={guestAccountsPasswordPicture} />,
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
            visual: <TilePicture src={temporaryMessagesDecidesPicture} />,
        },
        {
            id: 'kept',
            titleKey: 'tileHelp.temporaryMessages.kept.title',
            bodyKey: 'tileHelp.temporaryMessages.kept.body',
            visual: <TilePicture src={temporaryMessagesKeptPicture} />,
        },
    ],
};
