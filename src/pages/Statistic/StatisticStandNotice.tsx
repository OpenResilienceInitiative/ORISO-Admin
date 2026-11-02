import { useTranslation } from 'react-i18next';
import type { StatisticSnapshotInterval } from '../../api/statistic/getDashboardStatistics';

interface Props {
    generatedAt: string;
    snapshotInterval: StatisticSnapshotInterval;
    className?: string;
}

/**
 * Says when the dashboard numbers were calculated and, for a fixed stand, when new ones come, so
 * nobody reloads in vain. Shown in German time, the zone of the 06:00 cutoff (UserService#1547).
 */
export const StatisticStandNotice = ({ generatedAt, snapshotInterval, className }: Props) => {
    const { t, i18n } = useTranslation();
    const calculatedAt = new Date(generatedAt);
    if (Number.isNaN(calculatedAt.getTime())) return null;

    const date = new Intl.DateTimeFormat(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
    }).format(calculatedAt);

    return (
        <p className={className}>
            <span>{t('statistic.dashboard.stand.asOf', { date })}</span>
            {snapshotInterval !== 'LIVE' && <span> {t(`statistic.dashboard.stand.next.${snapshotInterval}`)}</span>}
        </p>
    );
};
