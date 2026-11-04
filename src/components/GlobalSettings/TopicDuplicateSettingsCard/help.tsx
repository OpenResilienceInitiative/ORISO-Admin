import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import duplicatePicture from '../../../resources/img/tile-help/duplicate.webp';

export const topicDuplicateHelp: TileHelpTopic = {
    id: 'topicDuplicate',
    titleKey: 'globalSettings.topicDuplicate.title',
    essenceKey: 'tileHelp.topicDuplicate.essence',
    slides: [
        {
            id: 'when',
            titleKey: 'tileHelp.topicDuplicate.when.title',
            bodyKey: 'tileHelp.topicDuplicate.when.body',
            visual: <TilePicture src={duplicatePicture} />,
        },
        {
            id: 'who',
            titleKey: 'tileHelp.topicDuplicate.who.title',
            bodyKey: 'tileHelp.topicDuplicate.who.body',
        },
        {
            id: 'later',
            titleKey: 'tileHelp.topicDuplicate.later.title',
            bodyKey: 'tileHelp.topicDuplicate.later.body',
        },
    ],
};
