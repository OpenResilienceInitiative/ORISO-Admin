import { TilePicture } from '../../../../TileFill';
import type { TileHelpTopic } from '../../../../TileHelp';
import legalTextPicture from '../../../../../resources/img/tile-help/legal-text.webp';
import legalTextTemplatePicture from '../../../../../resources/img/tile-help/legal-text/template.webp';
import legalTextAdoptPicture from '../../../../../resources/img/tile-help/legal-text/adopt.webp';
import privacyConfirmPicture from '../../../../../resources/img/tile-help/privacy/confirm.webp';
import privacyConsentPicture from '../../../../../resources/img/tile-help/privacy/consent.webp';

export const legalTextHelp: TileHelpTopic = {
    id: 'legalText',
    titleKey: 'imprint.title',
    essenceKey: 'tileHelp.legalText.essence',
    slides: [
        {
            id: 'draft',
            titleKey: 'tileHelp.legalText.draft.title',
            bodyKey: 'tileHelp.legalText.draft.body',
            visual: <TilePicture src={legalTextPicture} />,
        },
        {
            id: 'template',
            titleKey: 'tileHelp.legalText.template.title',
            bodyKey: 'tileHelp.legalText.template.body',
            visual: <TilePicture src={legalTextTemplatePicture} />,
        },
        {
            id: 'adopt',
            titleKey: 'tileHelp.legalText.adopt.title',
            bodyKey: 'tileHelp.legalText.adopt.body',
            visual: <TilePicture src={legalTextAdoptPicture} />,
        },
    ],
};

export const privacyHelp: TileHelpTopic = {
    id: 'privacy',
    titleKey: 'privacy.title',
    essenceKey: 'tileHelp.privacy.essence',
    slides: [
        {
            id: 'confirm',
            titleKey: 'tileHelp.privacy.confirm.title',
            bodyKey: 'tileHelp.privacy.confirm.body',
            visual: <TilePicture src={privacyConfirmPicture} />,
        },
        {
            id: 'consent',
            titleKey: 'tileHelp.privacy.consent.title',
            bodyKey: 'tileHelp.privacy.consent.body',
            visual: <TilePicture src={privacyConsentPicture} />,
        },
    ],
    related: [legalTextHelp],
};
