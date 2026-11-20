import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import type { StatisticSnapshotInterval } from '../../api/statistic/getDashboardStatistics';
import { StatisticStandNotice } from './StatisticStandNotice';

export interface StatisticInfoRowProps {
    /** The stand of the figures; null when there is none to state (no data yet, load error). */
    stand: { dataUntil: string | null; snapshotInterval: StatisticSnapshotInterval } | null;
    /**
     * The long privacy explanations that apply right now (hidden row, hidden total). When
     * any is given, the row adds the short "some values are protected" line and keeps
     * these behind a "Warum?" disclosure.
     */
    privacyReasons: string[];
}

/**
 * One quiet line above the statistic cards instead of a stack of full-width notice bars
 * (ORISO-Admin#1374): when the figures were taken and, only when something is withheld,
 * that some values are protected. The long reason sits behind an accessible disclosure.
 */
export const StatisticInfoRow = ({ stand, privacyReasons }: StatisticInfoRowProps) => {
    const { t } = useTranslation();
    const [isReasonOpen, setIsReasonOpen] = useState(false);
    const reasonId = useId();
    const hasPrivacyReasons = privacyReasons.length > 0;

    if (!stand && !hasPrivacyReasons) return null;

    return (
        <div className="statisticDashboard__infoRow" data-testid="statistic-info-row">
            <div className="statisticDashboard__infoItems">
                {stand && (
                    <div className="statisticDashboard__infoItem">
                        <ScheduleOutlinedIcon aria-hidden="true" focusable="false" />
                        <StatisticStandNotice
                            className="statisticDashboard__infoText"
                            dataUntil={stand.dataUntil}
                            snapshotInterval={stand.snapshotInterval}
                        />
                    </div>
                )}
                {hasPrivacyReasons && (
                    <div className="statisticDashboard__infoItem">
                        <LockOutlinedIcon aria-hidden="true" focusable="false" />
                        <p id={`${reasonId}-summary`} className="statisticDashboard__infoText">
                            {t('statistic.dashboard.protected.summary')}
                        </p>
                        <button
                            type="button"
                            className="statisticDashboard__infoWhy"
                            aria-expanded={isReasonOpen}
                            aria-controls={reasonId}
                            aria-describedby={`${reasonId}-summary`}
                            onClick={() => setIsReasonOpen((open) => !open)}
                        >
                            {t('statistic.dashboard.protected.why')}
                        </button>
                    </div>
                )}
            </div>
            {hasPrivacyReasons && (
                <div id={reasonId} className="statisticDashboard__infoReasons" hidden={!isReasonOpen}>
                    {privacyReasons.map((reason) => (
                        <p key={reason}>{reason}</p>
                    ))}
                </div>
            )}
        </div>
    );
};
