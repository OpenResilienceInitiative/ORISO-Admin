import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import translationPicture from '../../../resources/img/tile-help/translation.webp';
import translationProviderPicture from '../../../resources/img/tile-help/translation/provider.webp';
import translationKeyPicture from '../../../resources/img/tile-help/translation/key.webp';

export const translationHelp: TileHelpTopic = {
    id: 'translation',
    titleKey: 'legal.translation.settings.title',
    essenceKey: 'tileHelp.translation.essence',
    slides: [
        {
            id: 'what',
            titleKey: 'tileHelp.translation.what.title',
            bodyKey: 'tileHelp.translation.what.body',
            visual: <TilePicture src={translationPicture} />,
        },
        {
            id: 'provider',
            titleKey: 'tileHelp.translation.provider.title',
            bodyKey: 'tileHelp.translation.provider.body',
            visual: <TilePicture src={translationProviderPicture} />,
        },
        {
            id: 'key',
            titleKey: 'tileHelp.translation.key.title',
            bodyKey: 'tileHelp.translation.key.body',
            visual: <TilePicture src={translationKeyPicture} />,
        },
    ],
};
