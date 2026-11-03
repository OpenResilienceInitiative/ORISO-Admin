import type { TileHelpTopic } from '.';

/** Written once here; every tile that touches passwords links it with `related`. */
export const passwordChatsHelp: TileHelpTopic = {
    id: 'passwordChats',
    titleKey: 'tileHelp.passwordChats.title',
    essenceKey: 'tileHelp.passwordChats.essence',
    slides: [
        { id: 'key', titleKey: 'tileHelp.passwordChats.key.title', bodyKey: 'tileHelp.passwordChats.key.body' },
        { id: 'login', titleKey: 'tileHelp.passwordChats.login.title', bodyKey: 'tileHelp.passwordChats.login.body' },
    ],
};
