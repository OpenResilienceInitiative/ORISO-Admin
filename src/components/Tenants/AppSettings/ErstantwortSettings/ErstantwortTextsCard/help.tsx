import { TilePicture } from '../../../../TileFill';
import type { TileHelpTopic } from '../../../../TileHelp';
import firstMessagePicture from '../../../../../resources/img/tile-help/first-message.webp';

export const firstMessageHelp: TileHelpTopic = {
    id: 'firstMessage',
    titleKey: 'tenants.erstantwort.title',
    essenceKey: 'tileHelp.firstMessage.essence',
    slides: [
        {
            id: 'when',
            titleKey: 'tileHelp.firstMessage.when.title',
            bodyKey: 'tileHelp.firstMessage.when.body',
            visual: <TilePicture src={firstMessagePicture} />,
        },
        {
            id: 'deadline',
            titleKey: 'tileHelp.firstMessage.deadline.title',
            bodyKey: 'tileHelp.firstMessage.deadline.body',
        },
        {
            id: 'reads',
            titleKey: 'tileHelp.firstMessage.reads.title',
            bodyKey: 'tileHelp.firstMessage.reads.body',
        },
        {
            id: 'languages',
            titleKey: 'tileHelp.firstMessage.languages.title',
            bodyKey: 'tileHelp.firstMessage.languages.body',
        },
    ],
};
