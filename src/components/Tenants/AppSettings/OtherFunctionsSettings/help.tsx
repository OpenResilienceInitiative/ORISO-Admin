import { TilePicture } from '../../../TileFill';
import type { TileHelpSlide, TileHelpTopic } from '../../../TileHelp';
import otherFunctionsGeneralPicture from '../../../../resources/img/tile-help/other-functions/general.webp';

const topicsStatisticsSlide: TileHelpSlide = {
    id: 'general',
    titleKey: 'tileHelp.otherFunctions.general.title',
    bodyKey: 'tileHelp.otherFunctions.general.body',
    visual: <TilePicture src={otherFunctionsGeneralPicture} />,
};

export const otherFunctionsHelp: TileHelpTopic = {
    id: 'otherFunctions',
    titleKey: 'tenants.appSettings.otherFunctions.title',
    essenceKey: 'tileHelp.otherFunctions.essence',
    slides: [topicsStatisticsSlide],
};
