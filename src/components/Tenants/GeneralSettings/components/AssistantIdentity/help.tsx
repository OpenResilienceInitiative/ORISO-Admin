import { TilePicture } from '../../../../TileFill';
import type { TileHelpTopic } from '../../../../TileHelp';
import assistantPicture from '../../../../../resources/img/tile-help/assistant.webp';
import assistantInheritPicture from '../../../../../resources/img/tile-help/assistant/inherit.webp';
import assistantFormatsPicture from '../../../../../resources/img/tile-help/assistant/formats.webp';

export const assistantHelp: TileHelpTopic = {
    id: 'assistant',
    titleKey: 'settings.assistant.title',
    essenceKey: 'tileHelp.assistant.essence',
    slides: [
        {
            id: 'where',
            titleKey: 'tileHelp.assistant.where.title',
            bodyKey: 'tileHelp.assistant.where.body',
            visual: <TilePicture src={assistantPicture} />,
        },
        {
            id: 'inherit',
            titleKey: 'tileHelp.assistant.inherit.title',
            bodyKey: 'tileHelp.assistant.inherit.body',
            visual: <TilePicture src={assistantInheritPicture} />,
        },
        {
            id: 'formats',
            titleKey: 'tileHelp.assistant.formats.title',
            bodyKey: 'tileHelp.assistant.formats.body',
            visual: <TilePicture src={assistantFormatsPicture} />,
        },
    ],
};
