import { useState } from 'react';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useTranslation } from 'react-i18next';
import { M3FabMenu, type M3FabMenuItem } from '../M3FabMenu';
import { Modal } from '../Modal';
import type { PermissionPolicyMode, PolicyValue } from '../../types/permissionPolicy';
import styles from './styles.module.scss';

type PermissionPolicyControlProps = {
    featureKey: string;
    label: string;
    policy: PolicyValue<boolean>;
    level: 'platform' | 'tenant' | 'agency';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (policy: PolicyValue<boolean>) => void;
    pending?: boolean;
};

const policyKey = ({ value, mode }: PolicyValue<boolean>) => `${value ? 'enabled' : 'disabled'}-${mode.toLowerCase()}`;

const actionLabelKey = (value: boolean, mode: PermissionPolicyMode) => {
    if (mode === 'ENFORCED') {
        return value
            ? 'tenants.permissions.policy.activationEnforced'
            : 'tenants.permissions.policy.deactivationEnforced';
    }
    return value
        ? 'tenants.permissions.policy.activationSuggested'
        : 'tenants.permissions.policy.deactivationSuggested';
};

const statusLabelKey = (readOnly: boolean, mode: PermissionPolicyMode) => {
    if (readOnly) return 'tenants.permissions.policy.enforcedReadOnly';
    return mode === 'ENFORCED' ? 'tenants.permissions.policy.enforced' : 'tenants.permissions.policy.suggestion';
};

export const PermissionPolicyControl = ({
    featureKey,
    label,
    policy,
    level,
    open,
    onOpenChange,
    onChange,
    pending = false,
}: PermissionPolicyControlProps) => {
    const { t } = useTranslation();
    const [showInfo, setShowInfo] = useState(false);
    const readOnly = level !== 'platform' && policy.mode === 'ENFORCED' && policy.inherited === true;
    const option = (value: boolean, mode: PermissionPolicyMode): M3FabMenuItem => ({
        key: policyKey({ value, mode }),
        label: t(actionLabelKey(value, mode)),
        icon: mode === 'ENFORCED' ? <LockIcon /> : <LockOpenIcon />,
    });
    const items: M3FabMenuItem[] =
        level === 'agency'
            ? [option(true, 'SUGGESTED'), option(false, 'SUGGESTED')]
            : [
                  option(true, 'ENFORCED'),
                  option(false, 'ENFORCED'),
                  option(true, 'SUGGESTED'),
                  option(false, 'SUGGESTED'),
              ];
    items.push({ key: 'info', label: t('tenants.permissions.policy.moreInformation'), icon: <InfoIcon /> });

    const select = (key: string) => {
        if (key === 'info') {
            setShowInfo(true);
            return;
        }
        const [valueKey, modeKey] = key.split('-');
        onChange({ value: valueKey === 'enabled', mode: modeKey === 'enforced' ? 'ENFORCED' : 'SUGGESTED' });
    };

    return (
        <div className={styles.control} data-feature-policy={featureKey}>
            <span className={styles.meta}>
                {policy.mode === 'ENFORCED' ? <LockIcon /> : <LockOpenIcon />}
                {t(statusLabelKey(readOnly, policy.mode))}
            </span>
            {readOnly ? (
                <button
                    type="button"
                    className={`${styles.readOnlyButton} ${policy.value ? styles.active : styles.inactive}`}
                    aria-label={`${label}: ${t('tenants.permissions.policy.moreInformation')}`}
                    onClick={() => setShowInfo(true)}
                >
                    {policy.value ? <CheckIcon /> : <BlockIcon />}
                </button>
            ) : (
                <M3FabMenu
                    variant="action"
                    tone={policy.value ? 'primary' : 'neutral'}
                    items={items}
                    activeKey={policyKey(policy)}
                    open={open}
                    disabled={pending}
                    onOpenChange={onOpenChange}
                    onSelect={select}
                    openLabel={`${label}: ${t('tenants.permissions.policy.openMenu')} – ${t(
                        actionLabelKey(policy.value, policy.mode),
                    )}`}
                    closeLabel={t('tenants.permissions.policy.closeMenu')}
                />
            )}
            {showInfo && (
                <Modal
                    title={label}
                    description={t('tenants.permissions.policy.infoPurpose', { feature: label })}
                    icon={<InfoIcon />}
                    okLabelKey="tenants.permissions.policy.gotIt"
                    onConfirm={() => setShowInfo(false)}
                    onClose={() => setShowInfo(false)}
                    width={520}
                >
                    <div className={styles.infoText}>
                        <p>{t('tenants.permissions.policy.infoEffect', { feature: label })}</p>
                        <p>{t('tenants.permissions.policy.infoInheritance')}</p>
                        {readOnly && <p>{t('tenants.permissions.policy.infoReadOnly')}</p>}
                    </div>
                </Modal>
            )}
        </div>
    );
};
