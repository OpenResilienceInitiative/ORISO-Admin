import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import recoveryPicture from '../../../resources/img/tile-help/recovery.webp';
import { passwordChatsHelp } from '../../TileHelp/passwordChatsHelp';

export const chatRecoveryHelp: TileHelpTopic = {
    id: 'chatRecovery',
    titleKey: 'globalSettings.chatRecovery.title',
    essenceKey: 'tileHelp.chatRecovery.essence',
    slides: [
        {
            id: 'password',
            titleKey: 'tileHelp.chatRecovery.password.title',
            bodyKey: 'tileHelp.chatRecovery.password.body',
            visual: <TilePicture src={recoveryPicture} />,
        },
        {
            id: 'key',
            titleKey: 'tileHelp.chatRecovery.key.title',
            bodyKey: 'tileHelp.chatRecovery.key.body',
        },
        {
            id: 'fixed',
            titleKey: 'tileHelp.chatRecovery.fixed.title',
            bodyKey: 'tileHelp.chatRecovery.fixed.body',
        },
    ],
    related: [passwordChatsHelp],
};
