import classNames from 'classnames';
import CheckIcon from '@mui/icons-material/Check';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { Spin } from 'antd';
import { MuiSwitch } from '../mui/MuiSwitchField';
import styles from './styles.module.scss';

export type GoLiveConditionState = 'met' | 'open' | 'violated';

export interface GoLiveCondition {
    key: string;
    label: string;
    state: GoLiveConditionState;
    /** Short reason or pointer shown under the label (e.g. "Version veraltet"). */
    hint?: string;
}

interface GoLiveSwitchControl {
    checked: boolean;
    label: string;
    onChange: (next: boolean) => void;
    /** Shown under the switch label while activation is still blocked. */
    disabledHint?: string;
}

interface GoLiveStatusProps {
    title: string;
    description: string;
    /** Ordered condition chain — the order IS the intended onboarding sequence. */
    conditions: GoLiveCondition[];
    /**
     * The go-live switch (agency surface). Activating requires every condition
     * to be met; deactivating is ALWAYS possible — taking an area offline must
     * never be blocked by its own readiness rules.
     */
    switchControl?: GoLiveSwitchControl;
    isLoading?: boolean;
    className?: string;
}

/**
 * State reads from the glyph SHAPE first (check / empty ring / warning), colour
 * only reinforces it — a colour-only cue fails the a11y gate. None of these use
 * the tenant accent: a seed colour would make "done" look different per tenant.
 */
const stateIcon = (state: GoLiveConditionState) => {
    if (state === 'met') return <CheckIcon className={styles.iconMet} fontSize="small" />;
    if (state === 'violated') return <ErrorOutlinedIcon className={styles.iconViolated} fontSize="small" />;
    return <RadioButtonUncheckedIcon className={styles.iconOpen} fontSize="small" />;
};

/**
 * Go-live readiness for a whole area (Beratungsstelle, Träger). Deliberately a
 * SECTION, not a card: it scopes everything below it, sits topmost, and shows
 * the system-checked condition chain instead of a surprise button. The states
 * are computed by the system — nothing here is user-checkable.
 */
export const GoLiveStatus = ({
    title,
    description,
    conditions,
    switchControl,
    isLoading,
    className,
}: GoLiveStatusProps) => {
    const allMet = conditions.every((condition) => condition.state === 'met');
    // Deactivation stays possible in every state; only activation is gated.
    const switchDisabled = !!switchControl && !switchControl.checked && !allMet;

    return (
        <section className={classNames(styles.root, className)} data-testid="go-live-status" aria-label={title}>
            <div className={styles.head}>
                <h3 className={styles.title}>{title}</h3>
                {isLoading && <Spin size="small" />}
            </div>
            <p className={styles.description}>{description}</p>
            <ol className={styles.conditions}>
                {conditions.map((condition) => (
                    <li key={condition.key} className={styles.condition} data-condition-state={condition.state}>
                        <span className={styles.conditionIcon} aria-hidden="true">
                            {stateIcon(condition.state)}
                        </span>
                        <span className={styles.conditionBody}>
                            <span className={styles.conditionLabel}>{condition.label}</span>
                            {condition.hint && <span className={styles.conditionHint}>{condition.hint}</span>}
                        </span>
                    </li>
                ))}
            </ol>
            {switchControl && (
                <div className={styles.switchRow}>
                    <label className={styles.switchLabel} htmlFor="go-live-switch">
                        {switchControl.label}
                        {switchDisabled && switchControl.disabledHint && (
                            <span className={styles.switchHint}>{switchControl.disabledHint}</span>
                        )}
                    </label>
                    <MuiSwitch
                        checked={switchControl.checked}
                        disabled={switchDisabled}
                        onChange={switchControl.onChange}
                        id="go-live-switch"
                    />
                </div>
            )}
        </section>
    );
};

export default GoLiveStatus;
