import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
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
    className?: string;
}

const STATE_FALLBACKS: Record<PhaseStepperState, string> = {
    done: 'abgeschlossen',
    current: 'aktueller Schritt',
    pending: 'ausstehend',
    warning: 'Zustellproblem',
    error: 'fehlgeschlagen',
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
export const PhaseStepper = ({ phases, ariaLabel, showActiveLabel = true, className }: PhaseStepperProps) => {
    const { t } = useTranslation();
    const active = activePhase(phases);
    const allDone = phases.length > 0 && phases.every((phase) => phase.state === 'done');

    return (
        <div className={classNames(styles.stepper, className)}>
            <ol className={styles.track} aria-label={ariaLabel}>
                {phases.map((phase) => (
                    <li key={phase.key} className={classNames(styles.phase, styles[phase.state])}>
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
        </div>
    );
};
