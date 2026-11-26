import { useTranslation } from 'react-i18next';
import { ReactComponent as SwitchOffIcon } from '../../../../../resources/img/svg/oriso/switch_off_400_24px.svg';
import { ReactComponent as SwitchOnIcon } from '../../../../../resources/img/svg/oriso/switch_on_400_24px.svg';
import { ReactComponent as SilentIcon } from '../../../../../resources/img/svg/oriso/silent_400_24px.svg';
import {
    CASE_HANDOVER_EXPLANATION_LEVELS,
    type CaseHandoverExplanationLevel,
} from '../../../../../types/caseHandoverReasonPolicy';
import { M3FabMenu } from '../../../../M3FabMenu';
import styles from '../../../../PermissionPolicyControl/styles.module.scss';

type Props = {
    label: string;
    value: CaseHandoverExplanationLevel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (value: CaseHandoverExplanationLevel) => void;
    pending?: boolean;
    disabled?: boolean;
};

const levelKey = (level: CaseHandoverExplanationLevel) => `tenants.permissions.card.caseHandover.explanation.${level}`;

const triggerIcon = (level: CaseHandoverExplanationLevel) => {
    if (level === 'REQUIRED') return <SwitchOnIcon aria-hidden data-icon="switch-on" />;
    if (level === 'OPTIONAL') return <SwitchOffIcon aria-hidden data-icon="switch-off" />;
    return <SilentIcon aria-hidden data-icon="silent" />;
};

/**
 * Off / optional / required explanation text for one handover reason (FE#2040). Same row layout and
 * menu as the client-consent control next to it, so both read as one set of settings.
 */
export const CaseHandoverExplanationLevelControl = ({
    label,
    value,
    open,
    onOpenChange,
    onChange,
    pending = false,
    disabled = false,
}: Props) => {
    const { t } = useTranslation();
    return (
        <div className={styles.control} data-feature-policy="caseHandoverExplanationLevel">
            <div className={styles.copy}>
                <span className={styles.label}>{label}</span>
                <span className={styles.meta}>{t(levelKey(value))}</span>
            </div>
            <M3FabMenu
                variant="action"
                tone={value === 'OFF' ? 'neutral' : 'primary'}
                triggerIcon={triggerIcon(value)}
                items={CASE_HANDOVER_EXPLANATION_LEVELS.map((level) => ({
                    key: level,
                    label: t(levelKey(level)),
                    description: t(`${levelKey(level)}.effect`),
                    icon: triggerIcon(level),
                }))}
                activeKey={value}
                open={open}
                disabled={pending || disabled}
                onOpenChange={onOpenChange}
                onSelect={(key) => onChange(key as CaseHandoverExplanationLevel)}
                openLabel={`${label}: ${t('tenants.permissions.policy.openMenu')} – ${t(levelKey(value))}`}
                closeLabel={t('tenants.permissions.policy.closeMenu')}
            />
        </div>
    );
};
