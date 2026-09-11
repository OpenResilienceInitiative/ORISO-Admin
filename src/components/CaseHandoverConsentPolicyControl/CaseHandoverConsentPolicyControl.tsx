import { useState } from 'react';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import { ReactComponent as LockOpenRightFilledIcon } from '../../resources/img/svg/oriso/lock_open_right_filled_20px.svg';
import { ReactComponent as SilentIcon } from '../../resources/img/svg/oriso/silent_400_24px.svg';
import { ReactComponent as SwitchOffIcon } from '../../resources/img/svg/oriso/switch_off_400_24px.svg';
import { ReactComponent as SwitchOnIcon } from '../../resources/img/svg/oriso/switch_on_400_24px.svg';
import type {
    CaseHandoverConsentPolicy,
    CaseHandoverConsentValue,
    PermissionPolicyMode,
} from '../../types/permissionPolicy';
import { M3FabMenu, type M3FabMenuItem } from '../M3FabMenu';
import { Modal } from '../Modal';
import styles from '../PermissionPolicyControl/styles.module.scss';

type CaseHandoverConsentPolicyControlProps = {
    label: string;
    policy: CaseHandoverConsentPolicy;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (policy: CaseHandoverConsentPolicy) => void;
    level?: 'platform' | 'tenant' | 'agency';
    pending?: boolean;
    disabled?: boolean;
};

const policyKey = (policy: CaseHandoverConsentPolicy) => `${policy.value}-${policy.mode}`;

const labelKey = (value: CaseHandoverConsentValue, mode: PermissionPolicyMode) => {
    if (mode === 'ENFORCED') {
        return value === 'OPT_IN'
            ? 'tenants.permissions.consent.optInEnforced'
            : 'tenants.permissions.consent.optOutEnforced';
    }
    if (value === 'NONE') return 'tenants.permissions.consent.noneSuggested';
    return value === 'OPT_IN'
        ? 'tenants.permissions.consent.optInSuggested'
        : 'tenants.permissions.consent.optOutSuggested';
};

const triggerIcon = (value: CaseHandoverConsentValue) => {
    if (value === 'OPT_IN') return <SwitchOnIcon aria-hidden data-icon="switch-on" />;
    if (value === 'OPT_OUT') return <SwitchOffIcon aria-hidden data-icon="switch-off" />;
    return <SilentIcon aria-hidden data-icon="silent" />;
};

export const CaseHandoverConsentPolicyControl = ({
    label,
    policy,
    open,
    onOpenChange,
    onChange,
    level = 'tenant',
    pending = false,
    disabled = false,
}: CaseHandoverConsentPolicyControlProps) => {
    const { t } = useTranslation();
    const [showInfo, setShowInfo] = useState(false);
    const readOnly = level !== 'platform' && policy.mode === 'ENFORCED' && policy.inherited === true;
    let statusLabel = 'tenants.permissions.policy.suggestion';
    if (readOnly) {
        statusLabel = 'tenants.permissions.policy.enforcedReadOnly';
    } else if (policy.mode === 'ENFORCED') {
        statusLabel = 'tenants.permissions.policy.enforced';
    }

    const option = (value: CaseHandoverConsentValue, mode: PermissionPolicyMode): M3FabMenuItem => ({
        key: policyKey({ value, mode }),
        label: t(labelKey(value, mode)),
        icon:
            mode === 'ENFORCED' ? (
                <LockIcon />
            ) : (
                <LockOpenRightFilledIcon aria-hidden data-icon="lock-open-right-filled" />
            ),
    });

    const items: M3FabMenuItem[] =
        level === 'agency'
            ? [option('NONE', 'SUGGESTED'), option('OPT_IN', 'SUGGESTED'), option('OPT_OUT', 'SUGGESTED')]
            : [
                  option('OPT_IN', 'ENFORCED'),
                  option('OPT_OUT', 'ENFORCED'),
                  option('NONE', 'SUGGESTED'),
                  option('OPT_IN', 'SUGGESTED'),
                  option('OPT_OUT', 'SUGGESTED'),
              ];
    items.push({ key: 'info', label: t('tenants.permissions.policy.moreInformation'), icon: <InfoIcon /> });

    const select = (key: string) => {
        if (key === 'info') {
            setShowInfo(true);
            return;
        }
        const [value, mode] = key.split('-') as [CaseHandoverConsentValue, PermissionPolicyMode];
        onChange({ value, mode });
    };

    return (
        <div className={styles.control} data-feature-policy="caseHandoverClientConsent">
            <div className={styles.copy}>
                <span className={styles.label}>{label}</span>
                <span className={styles.meta}>
                    {policy.mode === 'ENFORCED' ? (
                        <LockIcon />
                    ) : (
                        <LockOpenRightFilledIcon aria-hidden data-icon="lock-open-right-filled" />
                    )}
                    {t(statusLabel)}
                </span>
            </div>

            {readOnly ? (
                <button
                    type="button"
                    className={`${styles.readOnlyButton} ${policy.value === 'NONE' ? styles.inactive : styles.active}`}
                    aria-label={`${label}: ${t('tenants.permissions.policy.moreInformation')}`}
                    onClick={() => setShowInfo(true)}
                >
                    {triggerIcon(policy.value)}
                </button>
            ) : (
                <M3FabMenu
                    variant="action"
                    tone={policy.value === 'NONE' ? 'neutral' : 'primary'}
                    triggerIcon={triggerIcon(policy.value)}
                    items={items}
                    activeKey={policyKey(policy)}
                    open={open}
                    disabled={pending || disabled}
                    onOpenChange={onOpenChange}
                    onSelect={select}
                    openLabel={`${label}: ${t('tenants.permissions.policy.openMenu')} – ${t(
                        labelKey(policy.value, policy.mode),
                    )}`}
                    closeLabel={t('tenants.permissions.policy.closeMenu')}
                />
            )}

            {showInfo && (
                <Modal
                    title={label}
                    description={t('tenants.permissions.consent.infoPurpose')}
                    icon={<InfoIcon />}
                    okLabelKey="tenants.permissions.policy.gotIt"
                    onConfirm={() => setShowInfo(false)}
                    onClose={() => setShowInfo(false)}
                    width={520}
                >
                    <div className={styles.infoText}>
                        <p>{t('tenants.permissions.consent.infoEffect')}</p>
                        <p>{t('tenants.permissions.policy.infoInheritance')}</p>
                        {readOnly && <p>{t('tenants.permissions.policy.infoReadOnly')}</p>}
                    </div>
                </Modal>
            )}
        </div>
    );
};
