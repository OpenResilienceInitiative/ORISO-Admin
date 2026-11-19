import { TilePicture } from '../../../TileFill';
import type { TileHelpSlide, TileHelpTopic } from '../../../TileHelp';
import otherFunctionsGeneralPicture from '../../../../resources/img/tile-help/other-functions/general.webp';
import otherFunctionsSupervisionPicture from '../../../../resources/img/tile-help/other-functions/supervision.webp';
import otherFunctionsTeamPicture from '../../../../resources/img/tile-help/other-functions/team.webp';
import { TEAM_FUNCTIONS } from '../../../TeamFunctions';

const generalSlide: TileHelpSlide = {
    id: 'general',
    titleKey: 'tileHelp.otherFunctions.general.title',
    bodyKey: 'tileHelp.otherFunctions.general.body',
    visual: <TilePicture src={otherFunctionsGeneralPicture} />,
};

const supervisionSlide: TileHelpSlide = {
    id: 'supervision',
    titleKey: 'tileHelp.otherFunctions.supervision.title',
    bodyKey: 'tileHelp.otherFunctions.supervision.body',
    visual: <TilePicture src={otherFunctionsSupervisionPicture} />,
};

const teamSlide: TileHelpSlide = {
    id: 'team',
    titleKey: TEAM_FUNCTIONS.chat.nameKey,
    bodyKey: TEAM_FUNCTIONS.chat.descriptionKey,
    visual: <TilePicture src={otherFunctionsTeamPicture} />,
};

export const otherFunctionsHelp: TileHelpTopic = {
    id: 'otherFunctions',
    titleKey: 'tenants.appSettings.otherFunctions.title',
    essenceKey: 'tileHelp.otherFunctions.essence',
    slides: [generalSlide, supervisionSlide, teamSlide],
};

/** ORISO-Admin#1577: one topic per section, opened from the section heading (as in Funktionszugriff). */
const sectionHelp = (slide: TileHelpSlide): TileHelpTopic => ({
    id: `otherFunctions.${slide.id}`,
    titleKey: slide.titleKey,
    essenceKey: slide.bodyKey,
    slides: [slide],
});

export const otherFunctionsGeneralHelp = sectionHelp(generalSlide);
export const otherFunctionsSupervisionHelp = sectionHelp(supervisionSlide);
export const otherFunctionsTeamHelp = sectionHelp(teamSlide);
