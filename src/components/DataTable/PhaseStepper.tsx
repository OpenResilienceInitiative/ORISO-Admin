import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { M3Tooltip } from '../M3Tooltip';
import styles from './phaseStepper.module.scss';

export type PhaseStepperState = 'done' | 'current' | 'pending' | 'warning' | 'error';

export interface PhaseStepperPhase {
    key: string;
    label: string;
    state: PhaseStepperState;
}

export interface PhaseStepperProps {
    phases: PhaseStepperPhase[];
    /** Accessible name of the whole stepper, e.g. "Onboarding-Fortschritt". */
    ariaLabel?: string;
    /** Show the label of the phase that needs attention (or "done") under the track. */
    showActiveLabel?: boolean;
    /**
     * Label under the track when NO phase is active — e.g. a draft invite whose
     * beads are all pending because nothing has happened yet. Without it the
     * track renders no label at all in that state.
     */
    idleLabel?: string;
    className?: string;
}

const STATE_FALLBACKS: Record<PhaseStepperState, string> = {
    done: 'abgeschlossen',
    current: 'aktueller Schritt',
    pending: 'ausstehend',
    warning: 'Zustellproblem',
    error: 'fehlgeschlagen',
};

/**
 * What a bead MEANS (C1/C2). The track carried its states in colour and glyph
 * only, so two rows both labelled „Eingeladen" differed by an orange „!" versus
 * a black dot with nothing anywhere saying why. These sentences say it, on
 * hover and on focus, for reached and not-yet-reached milestones alike. The
 * fallbacks double as the German i18n defaults.
 */
const STATE_HINT_FALLBACKS: Record<PhaseStepperState, string> = {
    done: 'dieser Schritt ist abgeschlossen.',
    current: 'dieser Schritt ist gerade an der Reihe.',
    pending: 'dieser Schritt wurde noch nicht erreicht.',
    warning: 'die E-Mail konnte nicht zugestellt werden.',
    error: 'dieser Schritt ist fehlgeschlagen.',
};

const DoneCheck = () => (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
        <path d="M3.1 6 1 3.9l.8-.8 1.3 1.3L6 1.5l.8.8z" fill="currentColor" />
    </svg>
);

/** The phase whose label the compact track surfaces: the first one needing attention. */
const activePhase = (phases: PhaseStepperPhase[]): PhaseStepperPhase | undefined =>
    phases.find((phase) => phase.state === 'current' || phase.state === 'warning' || phase.state === 'error') ??
    (phases.every((phase) => phase.state === 'done') ? phases[phases.length - 1] : undefined);

/**
 * Compact horizontal per-row progress stepper (M3 "bead track"): one bead per
 * phase, connected by short track segments that fill as phases complete.
 * States: done (filled secondary + check), current (primary ring — the row's
 * one accent), pending (hollow), warning (amber), error (magenta error role).
 *
 * Screen readers get the full list ("Eingeladen – abgeschlossen, …"); sighted
 * users get the beads plus the label of the phase that currently matters.
 */
export const PhaseStepper = ({
    phases,
    ariaLabel,
    showActiveLabel = true,
    idleLabel,
    className,
}: PhaseStepperProps) => {
    const { t } = useTranslation();
    const active = activePhase(phases);
    const allDone = phases.length > 0 && phases.every((phase) => phase.state === 'done');

    return (
        <div className={classNames(styles.stepper, className)}>
            <ol className={styles.track} aria-label={ariaLabel}>
                {phases.map((phase) => (
                    <li key={phase.key} className={classNames(styles.phase, styles[phase.state])}>
                        <M3Tooltip
                            text={`${phase.label}: ${t(
                                `dataTable.phase.stateHint.${phase.state}`,
                                STATE_HINT_FALLBACKS[phase.state],
                            )}`}
                        >
                            {/* The bead is the hover target AND the focus target:
                                the explanation is the only place the colour code
                                is written down, so it cannot be mouse-only. */}
                            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger, see above */}
                            <span className={styles.bead} tabIndex={0}>
                                <span className={styles.dot} aria-hidden>
                                    {phase.state === 'done' && <DoneCheck />}
                                    {(phase.state === 'warning' || phase.state === 'error') && (
                                        <span className={styles.mark}>!</span>
                                    )}
                                </span>
                                <span className={styles.srOnly}>
                                    {phase.label}
                                    {' – '}
                                    {t(`dataTable.phase.state.${phase.state}`, STATE_FALLBACKS[phase.state])}
                                </span>
                            </span>
                        </M3Tooltip>
                    </li>
                ))}
            </ol>
            {showActiveLabel && active && (
                <span
                    aria-hidden
                    className={classNames(styles.activeLabel, {
                        [styles.activeLabelDone]: allDone,
                        [styles.activeLabelWarning]: active.state === 'warning',
                        [styles.activeLabelError]: active.state === 'error',
                    })}
                >
                    {active.label}
                </span>
            )}
            {showActiveLabel && !active && idleLabel && (
                // Neutral by design: the idle state accents nothing, exactly like
                // its all-pending beads.
                <span aria-hidden className={styles.activeLabel}>
                    {idleLabel}
                </span>
            )}
        </div>
    );
};
