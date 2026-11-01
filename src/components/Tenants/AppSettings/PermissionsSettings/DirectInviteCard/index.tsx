import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { resolvePermissionPolicy } from '../permissionsSettingsUtils';
import styles from './styles.module.scss';

/**
 * ORISO-Admin#1242 — "Direkteinladung erlauben": may counsellors hand out direct links, per
 * chat type. Keys and inheritance come from ORISO-TenantService#332 (platform force-allow /
 * force-deny → Träger) and ORISO-AgencyService#347 (Beratungsstelle may only restrict: a Träger
 * "off" wins, an unset centre value follows the Träger). Default on, like every conversation feature.
 */
export const DIRECT_INVITE_FIELDS = [
    { field: 'featureDirectInviteChatEnabled', labelKey: 'tenants.permissions.directInvite.chat' },
    { field: 'featureDirectInviteAudioEnabled', labelKey: 'tenants.permissions.directInvite.audio' },
    { field: 'featureDirectInviteVideoEnabled', labelKey: 'tenants.permissions.directInvite.video' },
] as const;

export type DirectInviteCardProps = {
    restrictedFields: Set<string>;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    fallbackValues?: Record<string, unknown>;
    /** Beratungsstelle page: the Träger's effective policies. A Träger "off" or an enforced value locks the row. */
    traegerPolicies?: Record<string, PolicyValue<boolean>>;
    /** Beratungsstelle page: until the Träger's policies are read, no row is editable. */
    traegerPoliciesStatus?: 'pending' | 'error' | 'success';
    pendingPolicyFields?: ReadonlySet<string>;
    openPolicyMenu?: string | null;
    onOpenPolicyMenu?: (fieldKey: string | null) => void;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const DirectInviteCard = ({
    restrictedFields,
    policyLevel = 'tenant',
    permissionPolicies,
    fallbackValues,
    traegerPolicies,
    traegerPoliciesStatus = 'success',
    pendingPolicyFields,
    openPolicyMenu,
    onOpenPolicyMenu,
    onPolicyChange,
}: DirectInviteCardProps) => {
    const { t } = useTranslation();

    const isAgency = policyLevel === 'agency';
    const offOnTraeger = (field: string) => isAgency && traegerPolicies?.[field]?.value === false;
    const enforcedOnTraeger = (field: string) => isAgency && traegerPolicies?.[field]?.mode === 'ENFORCED';

    const policyFor = (field: string): PolicyValue<boolean> => {
        if (offOnTraeger(field) || enforcedOnTraeger(field)) {
            return { value: traegerPolicies?.[field]?.value === true, mode: 'ENFORCED', inherited: true };
        }
        // An unset centre value follows the Träger (AgencyService EffectiveAgencySettingsResolver).
        const fallback =
            fallbackValues?.[field] ?? (policyLevel === 'agency' ? traegerPolicies?.[field]?.value : undefined);
        return resolvePermissionPolicy(permissionPolicies, field, fallback, restrictedFields);
    };

    const lockedNote = (field: string) => {
        if (offOnTraeger(field)) return t('tenants.permissions.directInvite.offOnTraeger');
        if (enforcedOnTraeger(field)) return t('tenants.permissions.directInvite.enforcedOnTraeger');
        if (restrictedFields.has(field)) return t('tenants.permissions.asker.restrictedReason');
        return null;
    };

    // Beratungsstelle: never show editable defaults in place of a Träger value that is not read yet
    // (same rule as the channel switches on this page).
    const rows = () => {
        if (isAgency && traegerPoliciesStatus === 'pending') {
            return (
                <div data-testid="direct-invite-traeger-loading">
                    <Skeleton active title={false} paragraph={{ rows: 3 }} />
                </div>
            );
        }
        if (isAgency && traegerPoliciesStatus === 'error') {
            return (
                <p className={styles.callsNote} role="status">
                    {t('tenants.permissions.directInvite.traegerUnavailable')}
                </p>
            );
        }
        return (
            <>
                {DIRECT_INVITE_FIELDS.map(({ field, labelKey }) => (
                    <div key={field} className={styles.setting}>
                        <PermissionPolicyControl
                            featureKey={field}
                            label={t(labelKey)}
                            level={policyLevel}
                            policy={policyFor(field)}
                            open={openPolicyMenu === field}
                            pending={pendingPolicyFields?.has(field)}
                            onOpenChange={(open) => onOpenPolicyMenu?.(open ? field : null)}
                            onChange={(next) => onPolicyChange?.(field, next)}
                            supportingText={lockedNote(field) ?? undefined}
                        />
                    </div>
                ))}
            </>
        );
    };

    return (
        <Card titleKey="tenants.permissions.directInvite.title" dataTestId="direct-invite-card">
            <p className={styles.intro}>{t('tenants.permissions.directInvite.description')}</p>
            {rows()}
            <p className={styles.callsNote}>{t('tenants.permissions.directInvite.callsNote')}</p>
        </Card>
    );
};
