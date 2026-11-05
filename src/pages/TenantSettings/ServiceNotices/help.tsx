import { TilePicture } from '../../../components/TileFill';
import type { TileHelpTopic } from '../../../components/TileHelp';
import noticePicture from '../../../resources/img/tile-help/notice.webp';

export const serviceNoticesHelp: TileHelpTopic = {
    id: 'serviceNotices',
    titleKey: 'serviceNotices.title',
    essenceKey: 'tileHelp.serviceNotices.essence',
    slides: [
        {
            id: 'who',
            titleKey: 'tileHelp.serviceNotices.who.title',
            bodyKey: 'tileHelp.serviceNotices.who.body',
            visual: <TilePicture src={noticePicture} />,
        },
        {
            id: 'draft',
            titleKey: 'tileHelp.serviceNotices.draft.title',
            bodyKey: 'tileHelp.serviceNotices.draft.body',
        },
        {
            id: 'preview',
            titleKey: 'tileHelp.serviceNotices.preview.title',
            bodyKey: 'tileHelp.serviceNotices.preview.body',
        },
        {
            id: 'send',
            titleKey: 'tileHelp.serviceNotices.send.title',
            bodyKey: 'tileHelp.serviceNotices.send.body',
        },
    ],
};
