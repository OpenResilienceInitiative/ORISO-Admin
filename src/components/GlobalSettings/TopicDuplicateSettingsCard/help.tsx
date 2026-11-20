import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import duplicatePicture from '../../../resources/img/tile-help/duplicate.webp';
import topicDuplicateWhoPicture from '../../../resources/img/tile-help/topic-duplicate/who.webp';
import topicDuplicateLaterPicture from '../../../resources/img/tile-help/topic-duplicate/later.webp';

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
            visual: <TilePicture src={topicDuplicateWhoPicture} />,
        },
        {
            id: 'later',
            titleKey: 'tileHelp.topicDuplicate.later.title',
            bodyKey: 'tileHelp.topicDuplicate.later.body',
            visual: <TilePicture src={topicDuplicateLaterPicture} />,
        },
    ],
};
