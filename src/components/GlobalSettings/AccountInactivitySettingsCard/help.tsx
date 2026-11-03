import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import inactivePicture from '../../../resources/img/tile-help/inactive.webp';

export const inactivityHelp: TileHelpTopic = {
    id: 'inactivity',
    titleKey: 'globalSettings.accountInactivity.title',
    essenceKey: 'tileHelp.inactivity.essence',
    slides: [
        {
            id: 'effect',
            titleKey: 'tileHelp.inactivity.effect.title',
            bodyKey: 'tileHelp.inactivity.effect.body',
            visual: <TilePicture src={inactivePicture} />,
        },
        {
            id: 'activity',
            titleKey: 'tileHelp.inactivity.activity.title',
            bodyKey: 'tileHelp.inactivity.activity.body',
        },
        {
            id: 'period',
            titleKey: 'tileHelp.inactivity.period.title',
            bodyKey: 'tileHelp.inactivity.period.body',
        },
    ],
};
