import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as LockOpenRightFilledIcon } from '../../resources/img/svg/oriso/lock_open_right_filled_20px.svg';
import type { PolicyValue } from '../../types/permissionPolicy';
import styles from './styles.module.scss';

type PermissionPolicyControlProps = {
    featureKey: string;
    label: string;
    policy: PolicyValue<boolean>;
    level: 'platform' | 'tenant' | 'agency';
    onChange: (policy: PolicyValue<boolean>) => void;
    pending?: boolean;
    disabled?: boolean;
    supportingText?: string;
    /** Smaller button and label, for settings laid out as compact cards. */
    compact?: boolean;
};

/**
 * One setting with two independent decisions: the round button switches it on or off, the lock
 * decides whether it is a requirement for the levels below or stays adjustable there.
 */
export const PermissionPolicyControl = ({
    featureKey,
    label,
    policy,
    level,
    onChange,
    pending = false,
    disabled = false,
    supportingText,
    compact = false,
}: PermissionPolicyControlProps) => {
    const { t } = useTranslation();
    const enforced = policy.mode === 'ENFORCED';
    const inheritedRule = level !== 'platform' && enforced && policy.inherited === true;
    // A Beratungsstelle has no level below it, so it never sets a requirement.
    const canSetRule = level !== 'agency' && !inheritedRule && !disabled;
    const canSwitch = !inheritedRule && !disabled && !pending;

    const modeText = t(enforced ? 'tenants.permissions.policy.enforced' : 'tenants.permissions.policy.suggestion');
    const modeAction = t(
        enforced ? 'tenants.permissions.policy.makeAdjustable' : 'tenants.permissions.policy.makeRequired',
    );
    const lock = (
        <>
            {enforced ? <LockIcon /> : <LockOpenRightFilledIcon aria-hidden data-icon="lock-open-right-filled" />}
            {modeText}
        </>
    );
    const valueText = t(
        policy.value ? 'tenants.permissions.policy.activated' : 'tenants.permissions.policy.deactivated',
    );
    const valueAction = t(
        policy.value ? 'tenants.permissions.policy.deactivate' : 'tenants.permissions.policy.activate',
    );

    return (
        <div className={classNames(styles.control, { [styles.compact]: compact })} data-feature-policy={featureKey}>
            <div className={styles.copy}>
                <span className={styles.label}>{label}</span>
                {canSetRule ? (
                    <button
                        type="button"
                        className={classNames(styles.meta, styles.modeButton)}
                        aria-pressed={enforced}
                        aria-label={`${label}: ${modeText} – ${modeAction}`}
                        title={modeAction}
                        disabled={pending}
                        onClick={() => onChange({ value: policy.value, mode: enforced ? 'SUGGESTED' : 'ENFORCED' })}
                    >
                        {lock}
                    </button>
                ) : (
                    <span className={styles.meta}>{lock}</span>
                )}
                {supportingText && <span className={styles.supportingText}>{supportingText}</span>}
            </div>
            <button
                type="button"
                className={classNames(styles.switchButton, policy.value ? styles.active : styles.inactive)}
                aria-pressed={policy.value}
                aria-label={canSwitch ? `${label}: ${valueText} – ${valueAction}` : `${label}: ${valueText}`}
                title={canSwitch ? valueAction : undefined}
                disabled={!canSwitch}
                onClick={() => onChange({ value: !policy.value, mode: level === 'agency' ? 'SUGGESTED' : policy.mode })}
            >
                {policy.value ? <CheckIcon /> : <BlockIcon />}
            </button>
        </div>
    );
};
