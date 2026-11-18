import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { RowMenu } from '../UserTable/RowMenu';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import {
    JOURNEY_PHASES,
    editablePhases,
    isMustStep,
    missingSafetyAspects,
    phasesOf,
    registrationRoute,
    type Journey,
    type JourneyLevel,
    type JourneyPhase,
    type JourneyTopic,
} from './journey';
import { PhaseIcon } from './PhaseIcon';
import { journeyLabel, stepTitle } from './stepText';
import styles from './styles.module.scss';

/** Steps and topics listed on a tile before the rest is folded into "+ n". */
const SHOWN = 5;

interface JourneyCardProps {
    journey: Journey;
    topics: JourneyTopic[];
    /** Träger and Beratungsstelle see the platform's check-in but cannot change it (decision 29). */
    level?: JourneyLevel;
    onOpenPhase: (phase: JourneyPhase) => void;
    /** Without it (below the platform) the destinations are shown, not opened. */
    onOpenDestinations?: () => void;
    /** Journey actions; each is missing where the level may not use it. */
    onRename?: () => void;
    onDuplicate?: () => void;
    onRemove?: () => void;
    /** Whether anything leads to the journey (see `isReachable`). */
    reachable?: boolean;
}

/**
 * One journey, read left to right like a flight: departure, flight and arrival with their steps,
 * then the destinations. Each of the four tiles opens its own dialog.
 */
export const JourneyCard = ({
    journey,
    topics,
    level = 'platform',
    onOpenPhase,
    onOpenDestinations,
    onRename,
    onDuplicate,
    onRemove,
    reachable = true,
}: JourneyCardProps) => {
    const { t, i18n } = useTranslation();
    const label = journeyLabel(journey, t);
    const available = phasesOf(journey.conversationType);
    const noSafety = missingSafetyAspects(journey).length > 0;
    const route = registrationRoute(journey.conversationType);
    const nameOf = (id: number) => topics.find((topic) => topic.id === id)?.name ?? `#${id}`;
    const registration = journey.routes.registration.map(nameOf);
    const { links } = journey.routes;
    const unreachable = !reachable;

    const more = (count: number) =>
        count > SHOWN && (
            <li className={styles.tileMore}>{t('journeys.destinations.more', { count: count - SHOWN })}</li>
        );

    return (
        <li className={styles.journey} data-testid={`journey-${journey.id}`}>
            <div className={styles.journeyHeader}>
                <h3 className={styles.journeyTitle}>
                    <span className={styles.journeyNumber}>
                        {t('journeys.journey.number', { number: journey.number })}
                    </span>
                    {journey.name && <span>{journey.name}</span>}
                </h3>
                {(onRename || onDuplicate || onRemove) && (
                    <RowMenu
                        ariaLabel={t('journeys.journey.menu', { journey: label })}
                        items={[
                            ...(onRename
                                ? [
                                      {
                                          key: 'rename',
                                          label: t('journeys.journey.rename'),
                                          icon: <EditOutlined />,
                                          onSelect: onRename,
                                      },
                                  ]
                                : []),
                            ...(onDuplicate
                                ? [
                                      {
                                          key: 'duplicate',
                                          label: t('journeys.journey.duplicate'),
                                          icon: <ContentCopyOutlined />,
                                          onSelect: onDuplicate,
                                      },
                                  ]
                                : []),
                            ...(onRemove
                                ? [
                                      {
                                          key: 'remove',
                                          label: t('journeys.journey.remove'),
                                          icon: <DeleteOutline />,
                                          tone: 'error' as const,
                                          onSelect: onRemove,
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}
            </div>

            <div className={styles.phases}>
                {JOURNEY_PHASES.map((phase) => {
                    if (!available.includes(phase)) {
                        return (
                            <div key={phase} className={classNames(styles.phase, styles.phaseOff)}>
                                <span className={styles.phaseHead}>
                                    <span className={styles.phaseIcon} aria-hidden>
                                        <PhaseIcon phase={phase} />
                                    </span>
                                    <span className={styles.phaseName}>{t(`journeys.phase.${phase}`)}</span>
                                </span>
                                <span className={styles.tileEmpty}>{t('journeys.phase.notForGroups')}</span>
                            </div>
                        );
                    }
                    const steps = journey.phases[phase];
                    if (!editablePhases(level).includes(phase)) {
                        return (
                            <div
                                key={phase}
                                className={classNames(styles.phase, styles.phaseLocked)}
                                data-testid={`journey-${journey.id}-${phase}`}
                            >
                                <span className={styles.phaseHead}>
                                    <span className={styles.phaseIcon} aria-hidden>
                                        <PhaseIcon phase={phase} />
                                    </span>
                                    <span className={styles.phaseName}>{t(`journeys.phase.${phase}`)}</span>
                                    <LockOutlined className={styles.tileLock} aria-hidden />
                                </span>
                                <span className={styles.tileEmpty}>{t('journeys.level.departureLocked')}</span>
                                <ol className={styles.tileList} lang={i18n.language}>
                                    {steps.slice(0, SHOWN).map((step) => (
                                        <li key={step.id}>{stepTitle(step, MODULE_SOURCE_LANGUAGE, t)}</li>
                                    ))}
                                    {more(steps.length)}
                                </ol>
                            </div>
                        );
                    }
                    return (
                        <button
                            key={phase}
                            type="button"
                            className={styles.phase}
                            onClick={() => onOpenPhase(phase)}
                            data-testid={`journey-${journey.id}-${phase}`}
                        >
                            <span className={styles.phaseHead}>
                                <span className={styles.phaseIcon} aria-hidden>
                                    <PhaseIcon phase={phase} />
                                </span>
                                <span className={styles.phaseName}>{t(`journeys.phase.${phase}`)}</span>
                                <span className={styles.phaseValue}>
                                    {t('journeys.phase.stepCount', { count: steps.length })}
                                </span>
                            </span>
                            {steps.length === 0 ? (
                                <span className={styles.tileEmpty}>{t('journeys.phase.noSteps')}</span>
                            ) : (
                                <ol className={styles.tileList} lang={i18n.language}>
                                    {steps.slice(0, SHOWN).map((step) => (
                                        <li key={step.id}>
                                            {isMustStep(step) && (
                                                <>
                                                    <LockOutlined className={styles.tileLock} aria-hidden />
                                                    <span className={styles.srOnly}>{t('journeys.kind.must')}: </span>
                                                </>
                                            )}
                                            {stepTitle(step, MODULE_SOURCE_LANGUAGE, t)}
                                        </li>
                                    ))}
                                    {more(steps.length)}
                                </ol>
                            )}
                            {phase === 'flight' && noSafety && (
                                <span className={styles.phaseWarning}>
                                    <WarningAmberOutlined aria-hidden />
                                    {t('journeys.phase.noSafety')}
                                </span>
                            )}
                        </button>
                    );
                })}
                <button
                    type="button"
                    className={classNames(styles.phase, styles.phaseDestinations)}
                    onClick={onOpenDestinations}
                    disabled={!onOpenDestinations}
                    data-testid={`journey-${journey.id}-destinations`}
                >
                    <span className={styles.phaseHead}>
                        <span className={styles.phaseIcon} aria-hidden>
                            <PlaceOutlined />
                        </span>
                        <span className={styles.phaseName}>{t('journeys.destinations.name')}</span>
                    </span>
                    {route?.available && registration.length > 0 && (
                        <>
                            <span className={styles.tileRoute}>
                                <code>{route.path}</code>
                                {t('journeys.destinations.topics', { count: registration.length })}
                            </span>
                            <ul className={styles.tileList} lang={i18n.language}>
                                {registration.slice(0, SHOWN).map((name) => (
                                    <li key={name}>{name}</li>
                                ))}
                                {more(registration.length)}
                            </ul>
                        </>
                    )}
                    {links.length > 0 && (
                        <>
                            <span className={styles.tileRoute}>
                                <LinkOutlined aria-hidden />
                                {t('journeys.destinations.links', { count: links.length })}
                            </span>
                            <ul className={styles.tileList} lang={i18n.language}>
                                {links.map((link) => (
                                    <li key={link.id}>
                                        {link.name || t('journeys.link.unnamed')}
                                        {link.topicIds.length > 0 && ` → ${link.topicIds.map(nameOf).join(', ')}`}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {unreachable && (
                        <span className={styles.phaseWarning}>
                            <WarningAmberOutlined aria-hidden />
                            {t('journeys.destinations.none')}
                        </span>
                    )}
                </button>
            </div>
        </li>
    );
};
