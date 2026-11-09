import type { TileHelpTopic } from '../../../TileHelp';
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
        },
        {
            id: 'supervision',
            titleKey: 'tileHelp.otherFunctions.supervision.title',
            bodyKey: 'tileHelp.otherFunctions.supervision.body',
        },
        {
            id: 'team',
            titleKey: TEAM_FUNCTIONS.chat.nameKey,
            bodyKey: TEAM_FUNCTIONS.chat.descriptionKey,
        },
    ],
};
