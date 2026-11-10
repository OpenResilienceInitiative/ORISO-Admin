import { TilePicture } from '../../../TileFill';
import type { TileHelpTopic } from '../../../TileHelp';
import otherFunctionsGeneralPicture from '../../../../resources/img/tile-help/other-functions/general.webp';
import otherFunctionsSupervisionPicture from '../../../../resources/img/tile-help/other-functions/supervision.webp';
import otherFunctionsTeamPicture from '../../../../resources/img/tile-help/other-functions/team.webp';
import { TEAM_FUNCTIONS } from '../../../TeamFunctions';

export const otherFunctionsHelp: TileHelpTopic = {
    id: 'otherFunctions',
    titleKey: 'tenants.appSettings.otherFunctions.title',
    essenceKey: 'tileHelp.otherFunctions.essence',
    slides: [
        {
            id: 'general',
            titleKey: 'tileHelp.otherFunctions.general.title',
            bodyKey: 'tileHelp.otherFunctions.general.body',
            visual: <TilePicture src={otherFunctionsGeneralPicture} />,
        },
        {
            id: 'supervision',
            titleKey: 'tileHelp.otherFunctions.supervision.title',
            bodyKey: 'tileHelp.otherFunctions.supervision.body',
            visual: <TilePicture src={otherFunctionsSupervisionPicture} />,
        },
        {
            id: 'team',
            titleKey: TEAM_FUNCTIONS.chat.nameKey,
            bodyKey: TEAM_FUNCTIONS.chat.descriptionKey,
            visual: <TilePicture src={otherFunctionsTeamPicture} />,
        },
    ],
};
