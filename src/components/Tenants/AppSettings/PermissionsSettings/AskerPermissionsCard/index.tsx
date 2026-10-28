import { Trans, useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import { PermissionPolicyControl } from '../../../../PermissionPolicyControl/PermissionPolicyControl';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import { resolvePermissionPolicy } from '../permissionsSettingsUtils';
import styles from './styles.module.scss';

/**
 * ORISO-Admin#602 — the two permissions an advice seeker's own account depends on.
 *
 * <h3>Switch 1: Anzeigename</h3>
 *
 * Whether the person may **type** their own display name, or may only re-roll the generated one.
 * It is labelled **Anzeigename** and never "Nutzername", and that is not pedantry: the
 * **Anmeldename** (`userName`) is a different, immutable thing, and a Träger admin reading
 * "Nutzername" would believe they are deciding about the login credential. A test asserts the word
 * does not appear on this card.
 *
 * Why forbidding free entry is a real option rather than paternalism: a self-typed nickname is the
 * most common way anonymity is lost, because people reuse a handle that is searchable elsewhere.
 * The dice stays re-rollable without limit, so nothing is taken away.
 *
 * <h3>Switch 2: E-Mail hinterlassen</h3>
 *
 * Whether the person may leave an e-mail address at all. Switching it off silences **both** the
 * in-chat Erstantwort Baustein and the profile field — silencing only one produces the
 * contradiction the switch exists to remove.
 *
 * <h3>House rule: disable, never hide</h3>
 *
 * A setting the platform has not permitted renders as a **disabled** switch with a reason, not as
 * an absent one, so a Träger admin can see that the choice exists and who holds it.
 */

export type AskerPermissionsCardProps = {
    /** Field keys the current role may not change — rendered disabled, never hidden. */
    restrictedFields: Set<string>;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    fallbackValues?: Record<string, unknown>;
    pendingPolicyFields?: ReadonlySet<string>;
    openPolicyMenu?: string | null;
    onOpenPolicyMenu?: (fieldKey: string | null) => void;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
    /** Channel switches whose conversation-type tile is not shown on this page. */
    channelToggles?: Array<{ field: string; labelKey: string; defaultValue?: boolean }>;
};

export const AskerPermissionsCard = ({
    restrictedFields,
    policyLevel = 'tenant',
    permissionPolicies,
    fallbackValues,
    pendingPolicyFields,
    openPolicyMenu,
    onOpenPolicyMenu,
    onPolicyChange,
    channelToggles = [],
}: AskerPermissionsCardProps) => {
    const { t } = useTranslation();

    /* "Disable, never hide" is only half the rule — a switch that is greyed out
       with no explanation tells an admin they did something wrong. The reason
       says who actually holds the decision. */
    const policyFor = (field: string): PolicyValue<boolean> =>
        resolvePermissionPolicy(
            permissionPolicies,
            field,
            fallbackValues?.[field] ?? channelToggles.find((toggle) => toggle.field === field)?.defaultValue,
            restrictedFields,
        );

    const policyControl = (field: string, labelKey: string) => {
        const accountSetting = field === 'featureDisplayNameEditable' || field === 'featureAskerEmailEnabled';
        const setOnTraeger = policyLevel === 'agency' && accountSetting;
        return (
            <PermissionPolicyControl
                featureKey={field}
                label={t(labelKey)}
                level={policyLevel}
                policy={policyFor(field)}
                open={!setOnTraeger && openPolicyMenu === field}
                pending={pendingPolicyFields?.has(field)}
                disabled={setOnTraeger}
                supportingText={setOnTraeger ? t('tenants.permissions.card.notifications.setOnTraeger') : undefined}
                onOpenChange={(open) => !setOnTraeger && onOpenPolicyMenu?.(open ? field : null)}
                onChange={(next) => !setOnTraeger && onPolicyChange?.(field, next)}
            />
        );
    };

    const restrictedNote = (field: string) =>
        restrictedFields.has(field) ? (
            <p className={styles.restrictedReason}>{t('tenants.permissions.asker.restrictedReason')}</p>
        ) : null;

    return (
        <Card titleKey="tenants.permissions.asker.title">
            <p className={styles.intro}>
                <Trans i18nKey="tenants.permissions.asker.description" components={{ strong: <strong /> }} />
            </p>

            <div className={styles.setting}>
                <div className={styles.settingHeader}>
                    {policyControl('featureDisplayNameEditable', 'tenants.permissions.asker.displayName.label')}
                </div>
                <p className={styles.settingDescription}>{t('tenants.permissions.asker.displayName.description')}</p>
                {restrictedNote('featureDisplayNameEditable')}
            </div>

            <div className={styles.setting}>
                <div className={styles.settingHeader}>
                    {policyControl('featureAskerEmailEnabled', 'tenants.permissions.asker.email.label')}
                </div>
                <p className={styles.settingDescription}>{t('tenants.permissions.asker.email.description')}</p>
                {restrictedNote('featureAskerEmailEnabled')}
            </div>
            {/* FE#1725: channel switches live on the conversation-type tiles. Only switches of a
                tile hidden on this page land here, so no setting becomes unreachable. */}
            {channelToggles.length > 0 && (
                <>
                    <h3>{t('tenants.permissions.asker.channels.title')}</h3>
                    {channelToggles.map(({ field, labelKey }) => (
                        <div key={field} className={styles.setting}>
                            <div className={styles.settingHeader}>{policyControl(field, labelKey)}</div>
                            {restrictedNote(field)}
                        </div>
                    ))}
                </>
            )}
        </Card>
    );
};
