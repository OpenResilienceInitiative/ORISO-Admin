import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { JOURNEY_PHASES, type JourneyPhase } from './journey';
import { PhaseIcon } from './PhaseIcon';
import styles from './styles.module.scss';

interface FlightPathProps {
    /** Phases this conversation type has; the others are drawn faded. */
    available: readonly JourneyPhase[];
    /** With a short caption under each stop: what happens there. */
    captions?: boolean;
}

/**
 * What a journey is, drawn as a flight: take-off, in the air, landing, and the destinations it
 * leads to. Read as one sentence by screen readers.
 */
export const FlightPath = ({ available, captions = false }: FlightPathProps) => {
    const { t } = useTranslation();
    return (
        <ol
            className={classNames(styles.flightPath, { [styles.flightPathCaptions]: captions })}
            aria-label={t('journeys.path.label')}
        >
            {JOURNEY_PHASES.map((phase) => {
                const off = !available.includes(phase);
                return (
                    <li key={phase} className={classNames(styles.flightStop, { [styles.flightStopOff]: off })}>
                        <span className={styles.flightIcon} aria-hidden>
                            <PhaseIcon phase={phase} />
                        </span>
                        <span className={styles.flightName}>{t(`journeys.phase.${phase}`)}</span>
                        {captions && (
                            <span className={styles.flightCaption}>
                                {off ? t('journeys.phase.notForGroups') : t(`journeys.path.${phase}`)}
                            </span>
                        )}
                        {off && !captions && <span className={styles.srOnly}>{t('journeys.phase.notForGroups')}</span>}
                    </li>
                );
            })}
            <li className={styles.flightStop}>
                <span className={styles.flightIcon} aria-hidden>
                    <PlaceOutlined />
                </span>
                <span className={styles.flightName}>{t('journeys.destinations.name')}</span>
                {captions && <span className={styles.flightCaption}>{t('journeys.path.destinations')}</span>}
            </li>
        </ol>
    );
};
