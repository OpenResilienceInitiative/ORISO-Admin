import { TilePicture } from '../../../components/TileFill';
import type { TileHelpTopic } from '../../../components/TileHelp';
import noticePicture from '../../../resources/img/tile-help/notice.webp';
import serviceNoticesDraftPicture from '../../../resources/img/tile-help/service-notices/draft.webp';
import serviceNoticesPreviewPicture from '../../../resources/img/tile-help/service-notices/preview.webp';
import serviceNoticesSendPicture from '../../../resources/img/tile-help/service-notices/send.webp';

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
            visual: <TilePicture src={serviceNoticesDraftPicture} />,
        },
        {
            id: 'preview',
            titleKey: 'tileHelp.serviceNotices.preview.title',
            bodyKey: 'tileHelp.serviceNotices.preview.body',
            visual: <TilePicture src={serviceNoticesPreviewPicture} />,
        },
        {
            id: 'send',
            titleKey: 'tileHelp.serviceNotices.send.title',
            bodyKey: 'tileHelp.serviceNotices.send.body',
            visual: <TilePicture src={serviceNoticesSendPicture} />,
        },
    ],
};
