import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import masterdataPicture from '../../../resources/img/tile-help/master-data.webp';

export const documentMasterDataHelp: TileHelpTopic = {
    id: 'documentMasterData',
    titleKey: 'globalSettings.documentMasterData.title',
    essenceKey: 'tileHelp.documentMasterData.essence',
    slides: [
        {
            id: 'where',
            titleKey: 'tileHelp.documentMasterData.where.title',
            bodyKey: 'tileHelp.documentMasterData.where.body',
            visual: <TilePicture src={masterdataPicture} />,
        },
        {
            id: 'public',
            titleKey: 'tileHelp.documentMasterData.public.title',
            bodyKey: 'tileHelp.documentMasterData.public.body',
        },
        {
            id: 'figures',
            titleKey: 'tileHelp.documentMasterData.figures.title',
            bodyKey: 'tileHelp.documentMasterData.figures.body',
        },
    ],
};
