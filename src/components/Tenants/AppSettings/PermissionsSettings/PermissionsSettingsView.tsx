import { Form, Skeleton, type FormInstance } from 'antd';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { CardGrid } from '../../../CardGrid';
import { CardEditable } from '../../../CardEditable';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { AskerPermissionsCard } from './AskerPermissionsCard';
import { CaseHandoverCard } from './CaseHandoverCard';
import { DirectInviteSection } from './DirectInviteSection';
import { OPTION_ICONS } from './optionIcons';
import { PolicyOptionCard } from './PolicyOptionCard';
import { CONVERSATION_HELP } from './tileHelpTopics';
import { PermissionPolicyControl } from '../../../PermissionPolicyControl/PermissionPolicyControl';
import { RecipientScopeControl, type RecipientScopeControlProps } from './RecipientScope/RecipientScopeControl';
import {
    type EffectivePolicy,
    isSubToggleDisabled,
    permissionPolicySource,
    resolvePermissionPolicy,
} from './permissionsSettingsUtils';

import { syncMasterChildTogglesInForm } from './permissionsToggleLogic';
import { runtimeConfig } from '../../../../config/runtimeConfig';
import type {
    ChatTypeCardDef,
    ChatTypeCardKey,
    ChatTypeParticipantToggle,
    PermissionToggleCapability,
    ToggleAfterChangeHandler,
} from './types';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { TRAEGER_UNAVAILABLE_ATTRIBUTE } from './traegerUnavailable';
import styles from './styles.module.scss';

/** Own value plus a differing suggestion from above reads "Eigene Auswahl · Vorschlag: an/aus". */
const sourceHintKey = (policy: EffectivePolicy) => {
    const source = permissionPolicySource(policy);
    if (source !== 'own' || policy.suggestedValue === undefined) return source;
    return policy.suggestedValue ? 'ownSuggestedOn' : 'ownSuggestedOff';
};

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

// Long tiles get width instead of height, so a short neighbour is not stretched into an empty field.
const TILE_SPAN: Partial<Record<ChatTypeCardKey, 2 | 3>> = { oneOnOne: 3, liveChat: 3, group: 3, groupInternal: 2 };

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
    /** Values this level stored itself; they win over a suggestion from above (TenantService#363). */
    ownSettings?: Record<string, unknown>;
    pendingPolicyFields?: ReadonlySet<string>;
    onPolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
    /** Centre page: the Träger's policies for "Direkteinladung erlauben" (a Träger "off" wins). */
    traegerDirectInvitePolicies?: Record<string, PolicyValue<boolean>>;
    /** "Who can be picked" for internal group chats; none on the agency page (the setting is per Träger). */
    recipientScope?: Omit<RecipientScopeControlProps, 'level' | 'disabled'>;
    /** The links that open a live chat; shown on the live-chat tile (ORISO-Admin#1321). */
    liveChatLinks?: ReactNode;
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
    ownSettings,
    pendingPolicyFields,
    onPolicyChange,
    recipientScope,
    traegerDirectInvitePolicies,
    liveChatLinks,
}: PermissionsSettingsViewProps) => {
    const { t } = useTranslation();
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

    // Without a Träger the handover tile holds one switch and a sentence; its rules need the room.
    const showsHandoverRules = caseHandoverTenantPending || Boolean(caseHandoverTenantId);

    const policyFor = useCallback(
        (fieldKey: string, currentValue: unknown): PolicyValue<boolean> =>
            resolvePermissionPolicy(
                permissionPolicies,
                fieldKey,
                currentValue,
                restrictedFields,
                ownSettings?.[fieldKey],
            ),
        [permissionPolicies, restrictedFields, ownSettings],
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
        row: { setting: string; labelKey: string; policy: EffectivePolicy; disabled?: boolean; note?: string },
    ) => (
        <PolicyOptionCard
            key={row.setting}
            Icon={OPTION_ICONS[row.labelKey]}
            featureKey={row.setting}
            label={t(row.labelKey)}
            level={policyLevel}
            policy={row.policy}
            pending={policyPending(row.setting)}
            disabled={row.disabled}
            supportingText={
                row.note ??
                (policyLevel === 'platform'
                    ? undefined
                    : t(`tenants.permissions.policy.source.${sourceHintKey(row.policy)}`))
            }
            onChange={(next) => changePolicy(row.setting, next, form)}
        />
    );

    const participantRow = (
        form: FormInstance,
        toggle: ChatTypeParticipantToggle,
        getFieldValue: FormInstance['getFieldValue'],
    ) => {
        const isOn = (setting: string) => policyFor(setting, getFieldValue(['settings', setting])).value !== false;
        const accountEmailOff = Boolean(toggle.requiresAskerEmail) && !isOn('featureAskerEmailEnabled');
        const deliveryOff = toggle.worksWithDelivery && !isOn(toggle.worksWithDelivery);
        const nameEditingAllowed = channelsSetOnTraeger
            ? traegerChannelPolicies?.featureDisplayNameEditable?.value !== false
            : isOn('featureDisplayNameEditable');
        const accountNameEditingOff = toggle.requiresAskerNameEditing && !nameEditingAllowed;
        let note;
        if (toggle.notYetEffective) note = t('tenants.permissions.card.notifications.notYetEffective');
        else if (accountNameEditingOff) note = t('tenants.permissions.asker.displayName.masterOff');
        else if (accountEmailOff) note = t('tenants.permissions.asker.collection.masterOff');
        else if (deliveryOff) note = t('tenants.permissions.card.notifications.askNeedsDelivery');
        return toggleRow(form, {
            setting: toggle.setting,
            labelKey: toggle.labelKey,
            policy: channelsSetOnTraeger
                ? traegerChannelPolicies?.[toggle.setting] ?? {
                      value: toggle.defaultValue ?? true,
                      mode: 'SUGGESTED',
                  }
                : policyFor(toggle.setting, getFieldValue(['settings', toggle.setting]) ?? toggle.defaultValue),
            disabled: channelsSetOnTraeger || toggle.notYetEffective || accountEmailOff || accountNameEditingOff,
            note,
        });
    };

    // Centre page: until the Träger's values are read, show a loader or say they are unavailable,
    // never defaults passed off as the Träger's.
    const participantSwitches = (
        form: FormInstance,
        card: ChatTypeCardDef,
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
                <p
                    className={styles.cardDescriptionSecondary}
                    role="status"
                    {...{ [TRAEGER_UNAVAILABLE_ATTRIBUTE]: '' }}
                >
                    {t('tenants.permissions.card.notifications.traegerUnavailable')}
                </p>
            );
        }
        const namePolicy = card.askerNamePolicy;
        return (
            <div className={styles.togglesList}>
                {namePolicy && participantRow(form, namePolicy, getFieldValue)}
                {card.notifications?.toggles.map((toggle) => participantRow(form, toggle, getFieldValue))}
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
                    <CardGrid raster>
                        {/* ORISO-Admin#602: these two settings govern the account and the handover, so they
                            come before the per-chat-type feature cards. */}
                        <CardGrid.Item span={showsHandoverRules ? 3 : 1}>
                            <CaseHandoverCard
                                tenantId={caseHandoverTenantId}
                                tenantPending={caseHandoverTenantPending}
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                pendingPolicyFields={pendingPolicyFields}
                                onFeaturePolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                            />
                        </CardGrid.Item>
                        <CardGrid.Item span={showsHandoverRules ? 3 : 2}>
                            <AskerPermissionsCard
                                restrictedFields={restrictedFields}
                                policyLevel={policyLevel}
                                permissionPolicies={permissionPolicies}
                                fallbackValues={initialValues.settings as Record<string, unknown> | undefined}
                                pendingPolicyFields={pendingPolicyFields}
                                onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                channelToggles={hiddenTileChannelToggles}
                            />
                        </CardGrid.Item>
                        {cardsToRender.map((card) => (
                            <CardGrid.Item key={card.key} span={TILE_SPAN[card.key]}>
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
                                        const masterEnabled = masterField
                                            ? policyFor(masterField[1], getFieldValue(masterField)).value
                                            : true;
                                        const CardIcon = card.Icon;
                                        const showLinks = card.key === 'liveChat' && Boolean(liveChatLinks);
                                        return (
                                            <Card
                                                headerIcon={<CardIcon width={40} height={40} />}
                                                titleKey={card.titleKey}
                                                help={CONVERSATION_HELP[card.key]}
                                                dataTestId={`chat-type-card-${card.key}`}
                                            >
                                                <div className={showLinks ? styles.tileColumns : styles.tileBody}>
                                                    <div className={showLinks ? undefined : styles.tileBody}>
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
                                                                    pending={policyPending(masterField[1])}
                                                                    onChange={(next) =>
                                                                        changePolicy(masterField[1], next, form)
                                                                    }
                                                                />
                                                            ) : (
                                                                <>
                                                                    <span className={styles.masterLabel}>
                                                                        {t('tenants.permissions.card.activated')}
                                                                    </span>
                                                                    <span
                                                                        className={styles.masterRowPlaceholder}
                                                                        aria-hidden
                                                                    >
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

                                                        {showLinks && (
                                                            <>
                                                                <div className={styles.cardDivider} />
                                                                <div className={styles.togglesSectionLabel}>
                                                                    {t('liveChatLinks.title')}
                                                                </div>
                                                                {liveChatLinks}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className={showLinks ? undefined : styles.tileBody}>
                                                        {card.toggles.length > 0 && (
                                                            <>
                                                                {!showLinks && <div className={styles.cardDivider} />}

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
                                                                    labelKey: toggle.labelKey,
                                                                    // Nothing implements it yet: locked off.
                                                                    policy: unavailableHintKey
                                                                        ? {
                                                                              value: false,
                                                                              mode: 'ENFORCED',
                                                                              inherited: true,
                                                                          }
                                                                        : policyFor(
                                                                              toggle.field[1],
                                                                              getFieldValue(toggle.field),
                                                                          ),
                                                                    disabled:
                                                                        Boolean(unavailableHintKey) || disabledByMaster,
                                                                    note: disabledHintKey
                                                                        ? t(
                                                                              unavailableHintKey
                                                                                  ? 'tenants.permissions.feature.notYetAvailable'
                                                                                  : disabledHintKey,
                                                                          )
                                                                        : undefined,
                                                                });
                                                            })}
                                                        </div>
                                                        {/* The reason is long: below the cards, so one card does not stretch the row. */}
                                                        {[
                                                            ...new Set(
                                                                card.toggles.map((toggle) =>
                                                                    unavailableCapabilityHintKey(
                                                                        toggle.requiresCapability,
                                                                    ),
                                                                ),
                                                            ),
                                                        ]
                                                            .filter(Boolean)
                                                            .map((hintKey) => (
                                                                <p
                                                                    key={hintKey}
                                                                    className={styles.cardDescriptionSecondary}
                                                                >
                                                                    {t(hintKey as string)}
                                                                </p>
                                                            ))}

                                                        {/* ORISO-Admin#1242: a direct link opens a 1:1 session. */}
                                                        {card.key === 'oneOnOne' && (
                                                            <>
                                                                <div className={styles.cardDivider} />
                                                                <div className={styles.togglesSectionLabel}>
                                                                    {t('tenants.permissions.directInvite.title')}
                                                                </div>
                                                                <DirectInviteSection
                                                                    restrictedFields={restrictedFields}
                                                                    policyLevel={policyLevel}
                                                                    permissionPolicies={permissionPolicies}
                                                                    fallbackValues={
                                                                        initialValues.settings as
                                                                            | Record<string, unknown>
                                                                            | undefined
                                                                    }
                                                                    traegerPolicies={traegerDirectInvitePolicies}
                                                                    traegerPoliciesStatus={traegerChannelPoliciesStatus}
                                                                    pendingPolicyFields={pendingPolicyFields}
                                                                    onPolicyChange={(fieldKey, next) =>
                                                                        changePolicy(fieldKey, next, form)
                                                                    }
                                                                />
                                                            </>
                                                        )}

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
                                                                {participantSwitches(form, card, getFieldValue)}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    }}
                                </Form.Item>
                            </CardGrid.Item>
                        ))}
                    </CardGrid>
                </div>
            )}
        </CardEditable>
    );
};
