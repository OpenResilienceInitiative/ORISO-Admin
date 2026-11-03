import CheckRounded from '@mui/icons-material/CheckRounded';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface OnboardingFlowStep {
    label: string;
    state: 'done' | 'current' | 'upcoming';
}

export interface OnboardingFlowProps {
    steps: OnboardingFlowStep[];
    /** Visible time hint, e.g. "noch ca. 3 Min". */
    eta?: string;
    /** Spoken summary, e.g. "Schritt 2 von 3: Konto. Noch etwa 3 Minuten." */
    summary: string;
}

/**
 * Flow indicator for the multi-step onboarding variants: where am I, how many
 * steps remain, how long will it take. The visual stops are hidden from
 * assistive technology; `summary` carries the same information as one sentence.
 */
export const OnboardingFlow = ({ steps, eta, summary }: OnboardingFlowProps) => (
    <div className={styles.flow} role="status" aria-label={summary}>
        <ol className={styles.stops} aria-hidden="true">
            {steps.map((step, index) => (
                <li
                    key={step.label}
                    className={classNames(styles.stopItem, {
                        [styles.stopDone]: step.state === 'done',
                        [styles.stopCurrent]: step.state === 'current',
                    })}
                >
                    {index > 0 && (
                        <span
                            className={classNames(styles.stopLine, {
                                [styles.stopLineDone]: steps[index - 1]?.state === 'done',
                            })}
                        />
                    )}
                    <span className={styles.stop}>
                        <span className={styles.stopDot}>
                            {step.state === 'done' ? <CheckRounded fontSize="inherit" /> : index + 1}
                        </span>
                        <span className={styles.stopLabel}>{step.label}</span>
                    </span>
                </li>
            ))}
        </ol>
        {eta && (
            <p className={styles.eta} aria-hidden="true">
                {eta}
            </p>
        )}
    </div>
);
