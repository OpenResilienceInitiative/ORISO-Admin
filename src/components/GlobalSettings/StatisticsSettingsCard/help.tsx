import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../M3Button';
import { TilePicture } from '../../TileFill';
import type { TileHelpTopic } from '../../TileHelp';
import { StatisticStandNotice } from '../../../pages/Statistic/StatisticStandNotice';
import minimumPicture from '../../../resources/img/tile-help/statistics/minimum.webp';
import periodsPicture from '../../../resources/img/tile-help/statistics/periods.webp';
import protocolPicture from '../../../resources/img/tile-help/statistics/protocol.webp';
import trackingPicture from '../../../resources/img/tile-help/statistics/tracking.webp';
import updatePicture from '../../../resources/img/tile-help/statistics/update.webp';

/** The real button of this tile, inert here. */
const ProtocolButton = () => {
    const { t } = useTranslation();

    return (
        <M3Button variant="outlined" icon={<FileDownloadOutlinedIcon />}>
            {t('globalSettings.statistics.protocol.download')}
        </M3Button>
    );
};

export const statisticsHelp: TileHelpTopic = {
    id: 'statistics',
    titleKey: 'globalSettings.statistics.title',
    essenceKey: 'tileHelp.statistics.essence',
    slides: [
        {
            id: 'minimum',
            titleKey: 'tileHelp.statistics.minimum.title',
            bodyKey: 'tileHelp.statistics.minimum.body',
            visual: <TilePicture src={minimumPicture} />,
        },
        {
            id: 'update',
            titleKey: 'tileHelp.statistics.update.title',
            bodyKey: 'tileHelp.statistics.update.body',
            visual: <TilePicture src={updatePicture} />,
            example: <StatisticStandNotice dataUntil="2026-11-01" snapshotInterval="DAILY" />,
        },
        {
            id: 'period',
            titleKey: 'tileHelp.statistics.period.title',
            bodyKey: 'tileHelp.statistics.period.body',
            visual: <TilePicture src={periodsPicture} />,
        },
        {
            id: 'tracking',
            titleKey: 'tileHelp.statistics.tracking.title',
            bodyKey: 'tileHelp.statistics.tracking.body',
            visual: <TilePicture src={trackingPicture} />,
        },
        {
            id: 'protocol',
            titleKey: 'tileHelp.statistics.protocol.title',
            bodyKey: 'tileHelp.statistics.protocol.body',
            visual: <TilePicture src={protocolPicture} />,
            example: <ProtocolButton />,
        },
    ],
};
