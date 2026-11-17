import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { resolvePermissionPolicy } from '../permissionsSettingsUtils';
import { PolicyOptionCard } from '../PolicyOptionCard';
import styles from './styles.module.scss';

const modesOf = (medium: 'Chat' | 'Audio' | 'Video') =>
    [
        {
            field: `featureGuestAccountTemporary${medium}Enabled`,
            labelKey: 'tenants.permissions.guestAccountModes.mode.temporary',
        },
        {
            field: `featureGuestAccountGuestChooses${medium}Enabled`,
            labelKey: 'tenants.permissions.guestAccountModes.mode.guestChooses',
        },
        {
            field: `featureGuestAccountPermanent${medium}Enabled`,
            labelKey: 'tenants.permissions.guestAccountModes.mode.permanent',
        },
    ] as const;

/**
 * ORISO-UserService#1662 — "Gastkonten erlauben": which guest account modes a counsellor may offer
 * on a direct link or call link, per chat type. Keys come from ORISO-TenantService
 * (`featureGuestAccount<Mode><Medium>Enabled`, platform force-allow / force-deny → Träger). There is
 * no Beratungsstelle value, so the section is shown on the platform and Träger pages only. Default:
 * every mode allowed. With none allowed, guests get a permanent account (UserService fallback).
 */
export const GUEST_ACCOUNT_MODE_FIELDS = [
    {
        medium: 'chat',
        labelKey: 'tenants.permissions.directInvite.chat',
        Icon: ChatOutlinedIcon,
        modes: modesOf('Chat'),
    },
    {
        medium: 'audio',
        labelKey: 'tenants.permissions.directInvite.audio',
        Icon: CallOutlinedIcon,
        modes: modesOf('Audio'),
    },
    {
        medium: 'video',
        labelKey: 'tenants.permissions.directInvite.video',
        Icon: VideocamOutlinedIcon,
        modes: modesOf('Video'),
    },
] as const;

export type GuestAccountModeSectionProps = {
    restrictedFields: Set<string>;
    policyLevel?: 'platform' | 'tenant';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    fallbackValues?: Record<string, unknown>;
    pendingPolicyFields?: ReadonlySet<string>;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const GuestAccountModeSection = ({
    restrictedFields,
    policyLevel = 'tenant',
    permissionPolicies,
    fallbackValues,
    pendingPolicyFields,
    onPolicyChange,
}: GuestAccountModeSectionProps) => {
    const { t } = useTranslation();
    const idPrefix = useId();

    const policyFor = (field: string) =>
        resolvePermissionPolicy(permissionPolicies, field, fallbackValues?.[field], restrictedFields);

    return (
        <div className={styles.media} data-testid="guest-account-mode-section">
            {GUEST_ACCOUNT_MODE_FIELDS.map(({ medium, labelKey, Icon, modes }) => {
                const headingId = `${idPrefix}-${medium}`;
                const policies = modes.map(({ field }) => policyFor(field));
                const noneAllowed = policies.every((policy) => policy.value === false);
                return (
                    <div key={medium} role="group" aria-labelledby={headingId} className={styles.medium}>
                        <div id={headingId} className={styles.mediumHeading}>
                            <Icon className={styles.mediumIcon} aria-hidden />
                            {t(labelKey)}
                        </div>
                        {modes.map(({ field, labelKey: modeKey }, index) => (
                            <PolicyOptionCard
                                key={field}
                                featureKey={field}
                                label={t(modeKey)}
                                level={policyLevel}
                                policy={policies[index]}
                                pending={pendingPolicyFields?.has(field)}
                                onChange={(next) => onPolicyChange?.(field, next)}
                                supportingText={
                                    restrictedFields.has(field)
                                        ? t('tenants.permissions.asker.restrictedReason')
                                        : undefined
                                }
                            />
                        ))}
                        {noneAllowed && (
                            <p className={styles.note} role="status">
                                {t('tenants.permissions.guestAccountModes.noneAllowed')}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
