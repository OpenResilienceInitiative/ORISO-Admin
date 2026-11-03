import { TilePicture } from '../../../../TileFill';
import type { TileHelpTopic } from '../../../../TileHelp';
import contractPicture from '../../../../../resources/img/tile-help/contract.webp';

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
        },
        {
            id: 'deadline',
            titleKey: 'tileHelp.contract.deadline.title',
            bodyKey: 'tileHelp.contract.deadline.body',
        },
        {
            id: 'history',
            titleKey: 'tileHelp.contract.history.title',
            bodyKey: 'tileHelp.contract.history.body',
        },
    ],
};
