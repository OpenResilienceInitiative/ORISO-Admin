import { useTranslation } from 'react-i18next';
import type { StatisticSnapshotInterval } from '../../api/statistic/getDashboardStatistics';
import { formatStandDay } from './statisticDashboardData';

interface Props {
    dataUntil: string | null;
    snapshotInterval: StatisticSnapshotInterval;
    className?: string;
}

/**
 * Says up to which day a fixed stand goes and when new numbers come, so nobody reloads in vain. A
 * stand holds full German calendar days only (UserService#1547). One short line
 * ("Stand 03.11.2026 · neue Zahlen täglich um 6:00 Uhr"), so it fits the quiet info row.
 */
export const StatisticStandNotice = ({ dataUntil, snapshotInterval, className }: Props) => {
    const { t, i18n } = useTranslation();

    if (snapshotInterval === 'LIVE') {
        return <p className={className}>{t('statistic.dashboard.stand.live')}</p>;
    }
    if (!dataUntil) return null;

    return (
        <p className={className}>
            {t('statistic.dashboard.stand.asOf', { date: formatStandDay(dataUntil, i18n.language) })}
            {' · '}
            {t(`statistic.dashboard.stand.nextShort.${snapshotInterval}`)}
        </p>
    );
};
