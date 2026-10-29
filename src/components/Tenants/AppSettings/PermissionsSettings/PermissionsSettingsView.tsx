import { Form, Skeleton, type FormInstance } from 'antd';
import { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { CardDeck } from '../../../CardDeck';
import { CardEditable } from '../../../CardEditable';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { AskerPermissionsCard } from './AskerPermissionsCard';
import { CaseHandoverCard } from './CaseHandoverCard';
import { DirectInviteCard } from './DirectInviteCard';
import { PermissionPolicyControl } from '../../../PermissionPolicyControl/PermissionPolicyControl';
import { RecipientScopeControl, type RecipientScopeControlProps } from './RecipientScope/RecipientScopeControl';
import { isSubToggleDisabled, resolvePermissionPolicy } from './permissionsSettingsUtils';
import { syncMasterChildTogglesInForm } from './permissionsToggleLogic';
import { runtimeConfig } from '../../../../config/runtimeConfig';
import { ReactComponent as InfoIcon } from '../../../../resources/img/svg/i.svg';
import type {
    ChatTypeCardKey,
    ChatTypeNotificationToggle,
    PermissionToggleCapability,
    ToggleAfterChangeHandler,
} from './types';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import styles from './styles.module.scss';

/**
 * Reason a toggle cannot control anything in this environment, or `null` when
 * it can (ORISO-Admin#734).
 *
 * The AI media check is the only such capability today: it needs a deployed
 * content scanner and a signed zero-retention sub-processor agreement. Until
 * both exist the switch would move without changing any behaviour, which
 * misleads QA and the client — so it is disabled and says why.
 */
const unavailableCapabilityHintKey = (capability: PermissionToggleCapability | undefined): string | null => {
    if (capability === 'mediaAiScan' && !runtimeConfig.mediaAiScanAvailable) {
        return 'tenants.permissions.feature.mediaAiScanUnavailable';
    }
    return null;
};

export type PermissionsSettingsViewProps = {
    tenantId: string;
    /** Träger whose case-handover rules the card shows; none on the platform-wide page. */
    caseHandoverTenantId?: number;
    /** The Träger is still being resolved (centre page): the card waits instead of saying "none". */
    caseHandoverTenantPending?: boolean;
    /** Centre page: AgencyService does not store channel switches, so they are the Träger's, read-only. */
    channelsSetOnTraeger?: boolean;
    /** The Träger's channel policies shown when `channelsSetOnTraeger`. */
    traegerChannelPolicies?: Record<string, PolicyValue<boolean>>;
    /** Read state of `traegerChannelPolicies`: pending shows a loader, error says they could not be loaded. */
    traegerChannelPoliciesStatus?: 'pending' | 'error' | 'success';
    excludeCardKeys?: Array<ChatTypeCardKey>;
    isLoading: boolean;
    initialValues: Record<string, unknown>;
    formStateKey: string;
    restrictedFields: Set<string>;
    onToggleUpdate: ToggleAfterChangeHandler;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    pendingPolicyFields?: ReadonlySet<string>;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
    /** Centre page: the Träger's policies for "Direkteinladung erlauben" (a Träger "off" wins). */
    traegerDirectInvitePolicies?: Record<string, PolicyValue<boolean>>;
    /** "Who can be picked" for internal group chats; none on the agency page (the setting is per Träger). */
    recipientScope?: Omit<RecipientScopeControlProps, 'level' | 'disabled'>;
};

export const PermissionsSettingsView = ({
    tenantId,
    caseHandoverTenantId,
    caseHandoverTenantPending = false,
    channelsSetOnTraeger = false,
    traegerChannelPolicies,
    traegerChannelPoliciesStatus = 'success',
    excludeCardKeys,
    isLoading,
    initialValues,
    formStateKey,
    restrictedFields,
    onToggleUpdate,
    policyLevel = 'tenant',
    permissionPolicies,
    pendingPolicyFields,
    onPolicyChange,
    recipientScope,
    traegerDirectInvitePolicies,
}: PermissionsSettingsViewProps) => {
    const { t } = useTranslation();
    const [openPolicyMenu, setOpenPolicyMenu] = useState<string | null>(null);
    const cardsToRender = excludeCardKeys?.length
        ? CHAT_TYPE_CARDS.filter((card) => !excludeCardKeys.includes(card.key))
        : CHAT_TYPE_CARDS;

    // FE#1725: advice-seeker channel switches of tiles hidden on this page stay on the asker card
    // (not where they are the Träger's, read-only).
    const hiddenTileChannelToggles = channelsSetOnTraeger
        ? []
        : CHAT_TYPE_CARDS.filter(
              (card) => !cardsToRender.includes(card) && card.notifications?.audience === 'asker',
          ).flatMap((card) =>
              (card.notifications?.toggles ?? []).map((toggle) => ({
                  field: toggle.setting,
                  labelKey: toggle.fallbackLabelKey ?? toggle.labelKey,
                  defaultValue: toggle.defaultValue,
              })),
          );

    const policyFor = useCallback(
        (fieldKey: string, currentValue: unknown): PolicyValue<boolean> =>
            resolvePermissionPolicy(permissionPolicies, fieldKey, currentValue, restrictedFields),
        [permissionPolicies, restrictedFields],
    );
    const policyPending = useCallback(
        (fieldKey: string) => pendingPolicyFields?.has(fieldKey) === true,
        [pendingPolicyFields],
    );

    const changePolicy = useCallback(
        (fieldKey: string, next: PolicyValue<boolean>, form: FormInstance) => {
            const fieldPath = ['settings', fieldKey];
            form.setFieldValue(fieldPath, next.value);
            syncMasterChildTogglesInForm(form, fieldPath, next.value);
            const currentFormData = form.getFieldsValue(true);
            if (onPolicyChange) {
                onPolicyChange(fieldKey, next);
                return;
            }
            onToggleUpdate(fieldPath, next.value, currentFormData);
        },
        [onPolicyChange, onToggleUpdate],
    );

    // One row for every switch on a tile: feature toggles and notification channels alike.
    const toggleRow = (
        form: FormInstance,
        row: { setting: string; label: string; policy: PolicyValue<boolean>; disabled?: boolean; note?: string },
    ) => (
        <div key={row.setting} className={styles.toggleRow}>
            <PermissionPolicyControl
                featureKey={row.setting}
                label={row.label}
                level={policyLevel}
                policy={row.policy}
                open={openPolicyMenu === row.setting}
                pending={policyPending(row.setting)}
                disabled={row.disabled}
                supportingText={row.note}
                onOpenChange={(open) => setOpenPolicyMenu(open ? row.setting : null)}
                onChange={(next) => changePolicy(row.setting, next, form)}
            />
        </div>
    );

    const channelRow = (form: FormInstance, toggle: ChatTypeNotificationToggle, storedValue: unknown) =>
        toggleRow(form, {
            setting: toggle.setting,
            label: t(toggle.labelKey),
            policy: channelsSetOnTraeger
                ? traegerChannelPolicies?.[toggle.setting] ?? {
                      value: toggle.defaultValue ?? true,
                      mode: 'SUGGESTED',
                  }
                : policyFor(toggle.setting, storedValue ?? toggle.defaultValue),
            disabled: channelsSetOnTraeger || toggle.notYetEffective,
            note: toggle.notYetEffective ? t('tenants.permissions.card.notifications.notYetEffective') : undefined,
        });

    // Centre page: until the Träger's values are read, show a loader or say they are unavailable,
    // never defaults passed off as the Träger's.
    const channelSwitches = (
        form: FormInstance,
        toggles: Array<ChatTypeNotificationToggle>,
        getFieldValue: FormInstance['getFieldValue'],
    ) => {
        if (channelsSetOnTraeger && traegerChannelPoliciesStatus === 'pending') {
            return (
                <div data-testid="traeger-channels-loading">
                    <Skeleton active title={false} paragraph={{ rows: 2 }} />
                </div>
            );
        }
        if (channelsSetOnTraeger && traegerChannelPoliciesStatus === 'error') {
            return (
                <p className={styles.cardDescriptionSecondary} role="status">
                    {t('tenants.permissions.card.notifications.traegerUnavailable')}
                </p>
            );
        }
        return (
            <div className={styles.togglesList}>
                {toggles.map((toggle) => channelRow(form, toggle, getFieldValue(['settings', toggle.setting])))}
            </div>
        );
    };

    return (
        <CardEditable
            key={`permissions-${tenantId}-${formStateKey}`}
            className={styles.transparentCardWrapper}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            editMode
            hideSaveButton
            hideCancelButton
        >
            {({ form }) => (
                <div className={styles.cardGridOuter}>
                    <CardDeck
                        ariaLabel={t('tenants.permissions.title')}
                        className={styles.permissionsCardDeck}
                        deckClassName={styles.cardGrid}
                        previousLabel={t('permissions.cardDeck.previous')}
                        nextLabel={t('permissions.cardDeck.next')}
                    >
                        {/* ORISO-Admin#602: first card under Berechtigungen. These two
                            settings govern the advice seeker's own account, so they come
                            before the per-chat-type feature cards. */}
                        <CardDeck.Item className={styles.chatTypeCardSlot}>
                            <AskerPermissionsCard
                                restrictedFields={restrictedFields}
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                fallbackValues={initialValues.settings as Record<string, unknown> | undefined}
                                pendingPolicyFields={pendingPolicyFields}
                                openPolicyMenu={openPolicyMenu}
                                onOpenPolicyMenu={setOpenPolicyMenu}
                                onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                channelToggles={hiddenTileChannelToggles}
                            />
                        </CardDeck.Item>
                        <CardDeck.Item className={styles.chatTypeCardSlot}>
                            <CaseHandoverCard
                                tenantId={caseHandoverTenantId}
                                tenantPending={caseHandoverTenantPending}
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                pendingPolicyFields={pendingPolicyFields}
                                openPolicyMenu={openPolicyMenu}
                                onOpenPolicyMenu={setOpenPolicyMenu}
                                onFeaturePolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                            />
                        </CardDeck.Item>
                        {cardsToRender.map((card) => (
                            <CardDeck.Item key={card.key} className={styles.chatTypeCardSlot}>
                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => {
                                        if (!card.masterField) return false;
                                        const [, masterKey] = card.masterField;
                                        return prev?.settings?.[masterKey] !== curr?.settings?.[masterKey];
                                    }}
                                >
                                    {({ getFieldValue }) => {
                                        const { masterField } = card;
                                        const masterEnabled = masterField ? getFieldValue(masterField) !== false : true;
                                        const CardIcon = card.Icon;
                                        return (
                                            <Card
                                                headerIcon={<CardIcon width={40} height={40} />}
                                                titleKey={card.titleKey}
                                                dataTestId={`chat-type-card-${card.key}`}
                                            >
                                                <p className={styles.cardDescription}>
                                                    <InfoIcon
                                                        aria-hidden="true"
                                                        className={styles.cardDescriptionInfo}
                                                        focusable="false"
                                                    />
                                                    <Trans
                                                        i18nKey={card.descriptionKey}
                                                        components={{
                                                            strong: <strong />,
                                                            small: <span className={styles.cardDescriptionSecondary} />,
                                                        }}
                                                    />
                                                </p>

                                                <div className={styles.masterRow}>
                                                    {masterField ? (
                                                        <PermissionPolicyControl
                                                            featureKey={masterField[1]}
                                                            label={t('tenants.permissions.card.activated')}
                                                            level={policyLevel}
                                                            policy={policyFor(
                                                                masterField[1],
                                                                getFieldValue(masterField),
                                                            )}
                                                            open={openPolicyMenu === masterField[1]}
                                                            pending={policyPending(masterField[1])}
                                                            onOpenChange={(open) =>
                                                                setOpenPolicyMenu(open ? masterField[1] : null)
                                                            }
                                                            onChange={(next) =>
                                                                changePolicy(masterField[1], next, form)
                                                            }
                                                        />
                                                    ) : (
                                                        <>
                                                            <span className={styles.masterLabel}>
                                                                {t('tenants.permissions.card.activated')}
                                                            </span>
                                                            <span className={styles.masterRowPlaceholder} aria-hidden>
                                                                —
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {card.key === 'groupInternal' &&
                                                    recipientScope &&
                                                    policyLevel !== 'agency' && (
                                                        <RecipientScopeControl
                                                            {...recipientScope}
                                                            level={policyLevel}
                                                            disabled={!masterEnabled}
                                                        />
                                                    )}

                                                {card.toggles.length > 0 && (
                                                    <>
                                                        <div className={styles.cardDivider} />

                                                        <div className={styles.togglesSectionLabel}>
                                                            {t('tenants.permissions.card.configurableFeatures')}
                                                        </div>
                                                    </>
                                                )}

                                                <div className={styles.togglesList}>
                                                    {card.toggles.map((toggle) => {
                                                        const unavailableHintKey = unavailableCapabilityHintKey(
                                                            toggle.requiresCapability,
                                                        );
                                                        const disabledByMaster = isSubToggleDisabled(
                                                            card,
                                                            toggle.field,
                                                            masterEnabled,
                                                        );
                                                        const disabledHintKey =
                                                            unavailableHintKey ||
                                                            (disabledByMaster
                                                                ? 'tenants.permissions.feature.requiresMaster'
                                                                : null);
                                                        return toggleRow(form, {
                                                            setting: toggle.field[1],
                                                            label: t(toggle.labelKey),
                                                            policy: policyFor(
                                                                toggle.field[1],
                                                                getFieldValue(toggle.field),
                                                            ),
                                                            disabled: Boolean(unavailableHintKey) || disabledByMaster,
                                                            note: disabledHintKey ? t(disabledHintKey) : undefined,
                                                        });
                                                    })}
                                                </div>

                                                {card.notifications && (
                                                    <>
                                                        <div className={styles.cardDivider} />
                                                        <div className={styles.togglesSectionLabel}>
                                                            {t(
                                                                `tenants.permissions.card.notifications.${card.notifications.audience}Title`,
                                                            )}
                                                        </div>
                                                        {channelsSetOnTraeger && (
                                                            <p className={styles.cardDescriptionSecondary}>
                                                                {t(
                                                                    'tenants.permissions.card.notifications.setOnTraeger',
                                                                )}
                                                            </p>
                                                        )}
                                                        {channelSwitches(
                                                            form,
                                                            card.notifications.toggles,
                                                            getFieldValue,
                                                        )}
                                                    </>
                                                )}
                                            </Card>
                                        );
                                    }}
                                </Form.Item>
                            </CardDeck.Item>
                        ))}
                        {/* ORISO-Admin#1242: direct links per chat type, after the conversation types they open. */}
                        <CardDeck.Item className={styles.chatTypeCardSlot}>
                            <DirectInviteCard
                                restrictedFields={restrictedFields}
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                fallbackValues={initialValues.settings as Record<string, unknown> | undefined}
                                traegerPolicies={traegerDirectInvitePolicies}
                                traegerPoliciesStatus={traegerChannelPoliciesStatus}
                                pendingPolicyFields={pendingPolicyFields}
                                openPolicyMenu={openPolicyMenu}
                                onOpenPolicyMenu={setOpenPolicyMenu}
                                onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                            />
                        </CardDeck.Item>
                    </CardDeck>
                </div>
            )}
        </CardEditable>
    );
};
