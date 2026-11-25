import { TilePicture } from '../../../../TileFill';
import type { TileHelpTopic } from '../../../../TileHelp';
import coloursPicture from '../../../../../resources/img/tile-help/colours.webp';
import coloursDerivePicture from '../../../../../resources/img/tile-help/colours/derive.webp';
import coloursCheckPicture from '../../../../../resources/img/tile-help/colours/check.webp';

export const coloursHelp: TileHelpTopic = {
    id: 'colours',
    titleKey: 'settings.colors',
    essenceKey: 'tileHelp.colours.essence',
    slides: [
        {
            id: 'pick',
            titleKey: 'tileHelp.colours.pick.title',
            bodyKey: 'tileHelp.colours.pick.body',
            visual: <TilePicture src={coloursPicture} />,
        },
        {
            id: 'derive',
            titleKey: 'tileHelp.colours.derive.title',
            bodyKey: 'tileHelp.colours.derive.body',
            visual: <TilePicture src={coloursDerivePicture} />,
        },
        {
            id: 'check',
            titleKey: 'tileHelp.colours.check.title',
            bodyKey: 'tileHelp.colours.check.body',
            visual: <TilePicture src={coloursCheckPicture} />,
        },
    ],
};
