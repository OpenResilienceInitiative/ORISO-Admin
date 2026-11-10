import { TilePicture } from '../../../../TileFill';
import type { TileHelpTopic } from '../../../../TileHelp';
import contractPicture from '../../../../../resources/img/tile-help/contract.webp';
import contractSignPicture from '../../../../../resources/img/tile-help/contract/sign.webp';
import contractDeadlinePicture from '../../../../../resources/img/tile-help/contract/deadline.webp';
import contractHistoryPicture from '../../../../../resources/img/tile-help/contract/history.webp';

export const contractHelp: TileHelpTopic = {
    id: 'contract',
    titleKey: 'tenants.legal.dataProcessingAgreement.title',
    essenceKey: 'tileHelp.contract.essence',
    slides: [
        {
            id: 'publish',
            titleKey: 'tileHelp.contract.publish.title',
            bodyKey: 'tileHelp.contract.publish.body',
            visual: <TilePicture src={contractPicture} />,
        },
        {
            id: 'sign',
            titleKey: 'tileHelp.contract.sign.title',
            bodyKey: 'tileHelp.contract.sign.body',
            visual: <TilePicture src={contractSignPicture} />,
        },
        {
            id: 'deadline',
            titleKey: 'tileHelp.contract.deadline.title',
            bodyKey: 'tileHelp.contract.deadline.body',
            visual: <TilePicture src={contractDeadlinePicture} />,
        },
        {
            id: 'history',
            titleKey: 'tileHelp.contract.history.title',
            bodyKey: 'tileHelp.contract.history.body',
            visual: <TilePicture src={contractHistoryPicture} />,
        },
    ],
};
