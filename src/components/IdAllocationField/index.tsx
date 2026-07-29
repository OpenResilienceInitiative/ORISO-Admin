import { useTranslation } from 'react-i18next';
import { M3NumberField } from '../M3NumberField';
import type { IdValidationState, UseIdAllocationResult } from './useIdAllocation';
import styles from './styles.module.scss';

export { useIdAllocation } from './useIdAllocation';
export type { IdFieldMode, IdValidationState, UseIdAllocationResult } from './useIdAllocation';

export interface IdAllocationFieldProps {
    /** Visible field label, e.g. "Träger-ID" / "Beratungsstellen-ID". */
    label: string;
    /** State machine from {@link useIdAllocation} — owned by the parent so it can gate submits. */
    allocation: UseIdAllocationResult;
    disabled?: boolean;
    className?: string;
}

const BLOCKING_STATES: IdValidationState[] = ['reserved', 'assigned', 'error'];

/**
 * Invite-composer ID field (ORISO-Admin#570): the canonical M3NumberField with a
 * visible Auto default, a deliberate manual mode with live availability states,
 * free-ID stepping and an Auto toggle chip. In Auto mode the field pins no id —
 * the submit payload carries `allocationMode: AUTO` instead.
 */
export const IdAllocationField = ({ label, allocation, disabled = false, className }: IdAllocationFieldProps) => {
    const { t } = useTranslation();
    const { mode, value, validation, stepUpDisabled, stepDownDisabled, setManualValue, step, resetToAuto } = allocation;

    const isAuto = mode === 'auto';
    const isError = BLOCKING_STATES.includes(validation);

    const supportingText: Record<IdValidationState, string> = {
        auto: t('idAllocationField.autoHint', 'Die nächste freie ID wird automatisch vergeben.'),
        empty: t('idAllocationField.emptyHint', 'ID eingeben oder Auto wählen.'),
        checking: t('idAllocationField.checking', 'Verfügbarkeit wird geprüft …'),
        available: t('idAllocationField.available', 'ID {{id}} ist frei.', { id: value }),
        reserved: t('idAllocationField.reserved', 'Diese ID ist durch eine offene Einladung reserviert.'),
        assigned: t('idAllocationField.assigned', 'Diese ID ist bereits vergeben.'),
        error: t('idAllocationField.serviceError', 'Verfügbarkeit konnte nicht geprüft werden.'),
    };

    return (
        <M3NumberField
            className={className}
            disabled={disabled}
            displayText={isAuto ? t('idAllocationField.auto', 'Auto') : undefined}
            error={isError}
            label={label}
            stepDownDisabled={stepDownDisabled}
            stepUpDisabled={stepUpDisabled}
            supportingText={supportingText[validation]}
            trailing={
                <button
                    aria-label={`${t('idAllocationField.auto', 'Auto')} – ${t(
                        'idAllocationField.autoToggle',
                        'Automatische ID-Vergabe',
                    )}`}
                    aria-pressed={isAuto}
                    className={styles.autoToggle}
                    disabled={disabled}
                    type="button"
                    onClick={() => {
                        if (!isAuto) resetToAuto();
                    }}
                >
                    {t('idAllocationField.auto', 'Auto')}
                </button>
            }
            value={value}
            variant={validation === 'available' ? 'filled' : 'outlined'}
            onChange={setManualValue}
            onStep={step}
        />
    );
};

export default IdAllocationField;
