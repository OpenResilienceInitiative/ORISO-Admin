import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AutoDeleteOutlinedIcon from '@mui/icons-material/AutoDeleteOutlined';
import LockIcon from '@mui/icons-material/Lock';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PermissionPolicyMode, PolicyValue } from '../../../../../types/permissionPolicy';
import { resolvePermissionPolicy } from '../permissionsSettingsUtils';
import { M3FabMenu, type M3FabMenuItem } from '../../../../M3FabMenu';
import { ReactComponent as LockOpenRightFilledIcon } from '../../../../../resources/img/svg/oriso/lock_open_right_filled_20px.svg';
import controlStyles from '../../../../PermissionPolicyControl/styles.module.scss';
import cardStyles from '../PolicyOptionCard/styles.module.scss';
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
 * ORISO-UserService#1662 — "Gastkonten erlauben": which guest account a guest gets on a direct link
 * or call link, per chat type. ORISO-Admin#1560 (Frank, 2026-11-18): one type per medium, chosen
 * from a menu, instead of three independent switches. Keys come from ORISO-TenantService
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

export type GuestAccountMode = 'temporary' | 'guestChooses' | 'permanent';

const MODES: GuestAccountMode[] = ['temporary', 'guestChooses', 'permanent'];

const MODE_ICON: Record<GuestAccountMode, ReactNode> = {
    temporary: <AutoDeleteOutlinedIcon aria-hidden data-icon="temporary" />,
    guestChooses: <TouchAppOutlinedIcon aria-hidden data-icon="guest-chooses" />,
    permanent: <PersonOutlinedIcon aria-hidden data-icon="permanent" />,
};

/**
 * The one type the three stored switches amount to (`[temporary, guestChooses, permanent]`).
 * Several allowed (stored before #1560): "guest chooses" if it was among them, since the guest
 * could pick before; else the first. None allowed: permanent, as the UserService falls back.
 */
export const chosenGuestAccountMode = (allowed: boolean[]): GuestAccountMode => {
    const on = MODES.filter((_, index) => allowed[index]);
    if (on.length === 0) return 'permanent';
    if (on.length > 1 && on.includes('guestChooses')) return 'guestChooses';
    return on[0];
};

export type GuestAccountModeSectionProps = {
    restrictedFields: Set<string>;
    policyLevel?: 'platform' | 'tenant';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    fallbackValues?: Record<string, unknown>;
    /** Values this level stored; they win over an inherited suggestion. */
    ownSettings?: Record<string, unknown>;
    pendingPolicyFields?: ReadonlySet<string>;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const GuestAccountModeSection = ({
    restrictedFields,
    policyLevel = 'tenant',
    permissionPolicies,
    fallbackValues,
    ownSettings,
    pendingPolicyFields,
    onPolicyChange,
}: GuestAccountModeSectionProps) => {
    const { t } = useTranslation();
    const idPrefix = useId();
    const [openMedium, setOpenMedium] = useState<string | null>(null);
    const K = 'tenants.permissions.guestAccountModes';

    const policyFor = (field: string) =>
        resolvePermissionPolicy(
            permissionPolicies,
            field,
            fallbackValues?.[field],
            restrictedFields,
            ownSettings?.[field],
        );

    return (
        <div className={styles.media} data-testid="guest-account-mode-section">
            {GUEST_ACCOUNT_MODE_FIELDS.map(({ medium, labelKey, Icon, modes }) => {
                const headingId = `${idPrefix}-${medium}`;
                const policies = modes.map(({ field }) => policyFor(field));
                const chosen = chosenGuestAccountMode(policies.map((policy) => policy.value !== false));
                const chosenPolicy = policies[MODES.indexOf(chosen)];
                const mode: PermissionPolicyMode = policies.some((policy) => policy.mode === 'ENFORCED')
                    ? 'ENFORCED'
                    : 'SUGGESTED';
                const readOnly =
                    (policyLevel !== 'platform' &&
                        policies.some((policy) => policy.mode === 'ENFORCED' && policy.inherited === true)) ||
                    modes.some(({ field }) => restrictedFields.has(field));
                const pending = modes.some(({ field }) => pendingPolicyFields?.has(field));
                // All three allowed (the shipped default) simply means the guest chooses; two of three
                // cannot be shown as one choice, so that is said.
                const severalBefore = policies.filter((policy) => policy.value !== false).length === 2;
                const label = t(labelKey);
                const choiceLabel = (value: GuestAccountMode, valueMode: PermissionPolicyMode) =>
                    t(`${K}.choice.${value}.${valueMode}`);

                const option = (value: GuestAccountMode, valueMode: PermissionPolicyMode): M3FabMenuItem => ({
                    key: `${value}-${valueMode}`,
                    label: choiceLabel(value, valueMode),
                    description: t(`${K}.effect.${value}`),
                    icon:
                        valueMode === 'ENFORCED' ? (
                            <LockIcon />
                        ) : (
                            <LockOpenRightFilledIcon aria-hidden data-icon="lock-open-right-filled" />
                        ),
                });
                const items = [
                    ...MODES.map((value) => option(value, 'ENFORCED')),
                    ...MODES.map((value) => option(value, 'SUGGESTED')),
                ];
                const select = (key: string) => {
                    const [value, valueMode] = key.split('-') as [GuestAccountMode, PermissionPolicyMode];
                    modes.forEach(({ field }, index) =>
                        onPolicyChange?.(field, { value: MODES[index] === value, mode: valueMode }),
                    );
                    setOpenMedium(null);
                };

                return (
                    <div key={medium} role="group" aria-labelledby={headingId} className={styles.medium}>
                        <div id={headingId} className={styles.mediumHeading}>
                            <Icon className={styles.mediumIcon} aria-hidden />
                            {label}
                        </div>
                        <div className={cardStyles.card} data-feature-policy={`guestAccount-${medium}`}>
                            <div className={controlStyles.control}>
                                <div className={controlStyles.copy}>
                                    <span className={controlStyles.label}>{t(`${K}.mode.${chosen}`)}</span>
                                    {mode === 'ENFORCED' && (
                                        <span className={controlStyles.meta}>
                                            <LockIcon />
                                            {t('tenants.permissions.policy.enforced')}
                                        </span>
                                    )}
                                    <span className={controlStyles.supportingText}>{t(`${K}.effect.${chosen}`)}</span>
                                </div>
                                {readOnly ? (
                                    <button
                                        type="button"
                                        className={`${controlStyles.readOnlyButton} ${controlStyles.active}`}
                                        aria-label={`${label}: ${t(`${K}.mode.${chosen}`)}`}
                                        disabled
                                    >
                                        {MODE_ICON[chosen]}
                                    </button>
                                ) : (
                                    <M3FabMenu
                                        variant="action"
                                        tone="primary"
                                        triggerIcon={MODE_ICON[chosen]}
                                        items={items}
                                        activeKey={`${chosen}-${mode}`}
                                        open={openMedium === medium}
                                        disabled={pending}
                                        onOpenChange={(open) => setOpenMedium(open ? medium : null)}
                                        onSelect={select}
                                        openLabel={`${label}: ${t(
                                            'tenants.permissions.policy.openMenu',
                                        )} – ${choiceLabel(chosen, mode)}`}
                                        closeLabel={t('tenants.permissions.policy.closeMenu')}
                                    />
                                )}
                            </div>
                        </div>
                        {chosenPolicy && severalBefore && (
                            <p className={styles.note} role="status">
                                {t(`${K}.legacySeveral`)}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
