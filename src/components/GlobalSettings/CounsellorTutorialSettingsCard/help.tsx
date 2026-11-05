import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import tutorialsPicture from '../../../resources/img/tile-help/tutorials.webp';

export const tutorialsHelp: TileHelpTopic = {
    id: 'tutorials',
    titleKey: 'globalSettings.tutorials.title',
    essenceKey: 'tileHelp.tutorials.essence',
    slides: [
        {
            id: 'tours',
            titleKey: 'tileHelp.tutorials.tours.title',
            bodyKey: 'tileHelp.tutorials.tours.body',
            visual: <TilePicture src={tutorialsPicture} />,
        },
        {
            id: 'practice',
            titleKey: 'tileHelp.tutorials.practice.title',
            bodyKey: 'tileHelp.tutorials.practice.body',
        },
        {
            id: 'planned',
            titleKey: 'tileHelp.tutorials.planned.title',
            bodyKey: 'tileHelp.tutorials.planned.body',
        },
    ],
};
