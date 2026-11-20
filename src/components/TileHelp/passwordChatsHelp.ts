import { createElement } from 'react';
import { TilePicture } from '../TileFill';
import keyPicture from '../../resources/img/tile-help/password-chats/key.webp';
import loginPicture from '../../resources/img/tile-help/password-chats/login.webp';
import type { TileHelpTopic } from '.';

/** Written once here; every tile that touches passwords links it with `related`. */
export const passwordChatsHelp: TileHelpTopic = {
    id: 'passwordChats',
    titleKey: 'tileHelp.passwordChats.title',
    essenceKey: 'tileHelp.passwordChats.essence',
    slides: [
        {
            id: 'key',
            titleKey: 'tileHelp.passwordChats.key.title',
            bodyKey: 'tileHelp.passwordChats.key.body',
            visual: createElement(TilePicture, { src: keyPicture }),
        },
        {
            id: 'login',
            titleKey: 'tileHelp.passwordChats.login.title',
            bodyKey: 'tileHelp.passwordChats.login.body',
            visual: createElement(TilePicture, { src: loginPicture }),
        },
    ],
};
