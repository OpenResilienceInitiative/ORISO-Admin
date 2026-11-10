import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import masterdataPicture from '../../../resources/img/tile-help/master-data.webp';
import masterDataPublicPicture from '../../../resources/img/tile-help/master-data/public.webp';
import masterDataFiguresPicture from '../../../resources/img/tile-help/master-data/figures.webp';

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
            visual: <TilePicture src={masterDataPublicPicture} />,
        },
        {
            id: 'figures',
            titleKey: 'tileHelp.documentMasterData.figures.title',
            bodyKey: 'tileHelp.documentMasterData.figures.body',
            visual: <TilePicture src={masterDataFiguresPicture} />,
        },
    ],
};
