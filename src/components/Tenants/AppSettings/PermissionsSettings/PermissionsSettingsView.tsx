import { Form, Skeleton, type FormInstance } from 'antd';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleTile } from '../../../CollapsibleTile';
import { TileHelpButton } from '../../../TileHelp';
import { CardGrid } from '../../../CardGrid';
import { CardEditable } from '../../../CardEditable';
import { APP_ONLY_HINT_KEY, CHAT_TYPE_CARDS } from './chatTypeCards';
import { AskerPermissionsCard } from './AskerPermissionsCard';
import { CaseHandoverCard } from './CaseHandoverCard';
import { CaseSharingSection } from './CaseSharingSection';
import { TileSections } from '../../../TileSections';
import { SectionHelp } from './SectionHelp';
import { PermissionsIntro } from './PermissionsIntro';
import { SupervisionTile } from './SupervisionTile';
import { TraegerSettingCard } from './TraegerSettingCard';
import { TRAEGER_ONLY_SETTINGS, type TraegerOnlySettings } from './traegerFunctions';
import {
    GROUP_CHAT_UMBRELLA,
    affectsCalls,
    callsAllowed,
    groupChatUmbrellaPolicy,
    isGroupChatMaster,
} from './derivedLegacySettings';
import { TEAM_FUNCTIONS } from '../../../TeamFunctions';
import type { CaseSharingMode } from './CaseSharingSection/caseSharingMode';
import { DirectInviteSection } from './DirectInviteSection';
import { GuestAccountModeSection } from './GuestAccountModeSection';
import { OPTION_ICONS } from './optionIcons';
import { PolicyOptionCard } from './PolicyOptionCard';
import { ASKER_HELP, CONVERSATION_HELP, GUEST_ACCOUNT_HELP } from './tileHelpTopics';
import { askerAccountHelp, CHAT_TYPE_HELP, directInviteHelp, TEAM_CHAT_HELP } from './help';
import { PermissionPolicyControl } from '../../../PermissionPolicyControl/PermissionPolicyControl';
import { RecipientScopeControl, type RecipientScopeControlProps } from './RecipientScope/RecipientScopeControl';
import { CalendarCard, type CalendarCardProps } from './Calendar/CalendarCard';
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

/**
 * Own value that differs from a suggestion from above reads "Eigene Auswahl · Vorschlag: an/aus"
 * (TenantService#363). Every other source ("Vorschlag von oben") stays unsaid; the lock still reads
 * "Anpassbar" or "Vorgabe", and the card says what the feature does (#1558, Frank 2026-11-18).
 */
const conflictHintKey = (policy: EffectivePolicy) => {
    if (permissionPolicySource(policy) !== 'own' || policy.suggestedValue === undefined) return null;
    if (policy.suggestedValue === policy.value) return null;
    return policy.suggestedValue ? 'ownSuggestedOn' : 'ownSuggestedOff';
};

/** What a participant setting means for the person it concerns; channels differ by audience. */
const participantDescriptionKey = (audience: 'asker' | 'consultant', labelKey: string) =>
    `tenants.permissions.participantDescription.${audience}.${labelKey.split('.').at(-1)}`;

/** "tenants.permissions.feature.audioCalls" → its one-sentence description, if the feature has one. */
const featureDescriptionKey = (labelKey: string) =>
    labelKey.startsWith('tenants.permissions.feature.')
        ? `tenants.permissions.featureDescription.${labelKey.split('.').at(-1)}`
        : null;

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
// #1558: the internal group chats tile holds important settings too, so it no longer sits in a narrow column.
const TILE_SPAN: Partial<Record<ChatTypeCardKey, 2 | 3>> = { oneOnOne: 3, liveChat: 3, group: 3, groupInternal: 3 };

export type PermissionsSettingsViewProps = {
    tenantId: string;
    /** Träger whose case-handover rules the card shows; none on the platform-wide page. */
    caseHandoverTenantId?: number;
    /** The Träger is still being resolved (centre page): the card waits instead of saying "none". */
    caseHandoverTenantPending?: boolean;
    /**
     * ORISO-Admin#1558: case handover, team counselling or neither as one choice on the Mailberatung
     * tile; the separate handover tile goes. Without it the page keeps the separate tile.
     */
    caseSharing?: {
        /** The choice and whether it is a requirement below; undefined while loading. */
        policy: PolicyValue<CaseSharingMode> | undefined;
        onChange?: (policy: PolicyValue<CaseSharingMode>) => void;
        /** The choice is held by another level; says which. */
        disabledReason?: string;
        bothActive?: boolean;
    };
    /**
     * Name of a conversation type when the platform renamed it (ADR-036 decision 21, #1551);
     * without one the shipped name is shown.
     */
    typeNames?: Partial<Record<ChatTypeCardKey, string>>;
    /** Set: clicking a tile's icon opens the dialog for its name and icon (platform admin only). */
    onEditTypeAppearance?: (cardKey: ChatTypeCardKey) => void;
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
    /** Several fields that only make sense together, saved as one request (e.g. the guest account type). */
    onPoliciesChange?: (changes: Record<string, PolicyValue<boolean>>) => void;
    /** Centre page: the Träger's policies for "Direkteinladung erlauben" (a Träger "off" wins). */
    traegerDirectInvitePolicies?: Record<string, PolicyValue<boolean>>;
    /** "Who can be picked" for internal group chats; none on the agency page (the setting is per Träger). */
    recipientScope?: Omit<RecipientScopeControlProps, 'level' | 'disabled'>;
    /** Calendar visibility (ADR-032); like the group-chat scope it is per Träger, so none on the agency page. */
    calendar?: Omit<CalendarCardProps, 'level'>;
    /** The links that open a live chat; shown on the live-chat tile (ORISO-Admin#1321). */
    liveChatLinks?: ReactNode;
    /** What this page applies to, said in the page intro (e.g. one Träger, ORISO-Admin#1577). */
    introScopeNote?: ReactNode;
    /**
     * ORISO-Admin#1577: Team-Chat, stored per Träger only. Without it the page says it is set per
     * Träger (platform).
     */
    traegerSettings?: TraegerOnlySettings;
    /**
     * Träger page only: called after a call setting of a tile changed, with whether any conversation
     * type still offers calls, so the Träger's `isVideoCallAllowed` follows the tiles.
     */
    onCallsAllowedChange?: (allowed: boolean, change: { field: string; value: boolean }) => void;
};

export const PermissionsSettingsView = ({
    tenantId,
    caseHandoverTenantId,
    caseHandoverTenantPending = false,
    caseSharing,
    typeNames,
    onEditTypeAppearance,
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
    onPoliciesChange,
    recipientScope,
    calendar,
    traegerDirectInvitePolicies,
    liveChatLinks,
    introScopeNote,
    traegerSettings = { source: 'none' },
    onCallsAllowedChange,
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
    // #1558: the account settings are a section of the Mailberatung tile; only without that tile do
    // they keep a tile of their own.
    const askerInMailTile = cardsToRender.some((card) => card.key === 'oneOnOne');
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

    const applyPolicy = useCallback(
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

    /**
     * ORISO-Admin#1577: a tile change also keeps the two older switches the counselling app still
     * reads in step (see derivedLegacySettings.ts): the group-chat umbrella on every level, and the
     * Träger's call permission where the page can write it.
     */
    const changePolicy = useCallback(
        (fieldKey: string, next: PolicyValue<boolean>, form: FormInstance) => {
            const policyOf = (field: string): PolicyValue<boolean> =>
                field === fieldKey ? next : policyFor(field, form.getFieldValue(['settings', field]));
            applyPolicy(fieldKey, next, form);

            if (isGroupChatMaster(fieldKey)) {
                const current = policyOf(GROUP_CHAT_UMBRELLA);
                const lockedAbove =
                    restrictedFields.has(GROUP_CHAT_UMBRELLA) ||
                    (current.mode === 'ENFORCED' && current.inherited === true);
                const umbrella = groupChatUmbrellaPolicy(policyOf);
                const target = policyLevel === 'agency' ? { ...umbrella, mode: 'SUGGESTED' as const } : umbrella;
                if (!lockedAbove && (current.value !== target.value || current.mode !== target.mode)) {
                    applyPolicy(GROUP_CHAT_UMBRELLA, target, form);
                }
            }
            if (onCallsAllowedChange && affectsCalls(fieldKey)) {
                onCallsAllowedChange(
                    callsAllowed((field) => policyOf(field).value),
                    { field: fieldKey, value: next.value },
                );
            }
        },
        [applyPolicy, onCallsAllowedChange, policyFor, policyLevel, restrictedFields],
    );

    // Fields that belong together go out as one request where the page can save them so (#1560).
    const changePolicies = useCallback(
        (changes: Record<string, PolicyValue<boolean>>, form: FormInstance) => {
            if (!onPoliciesChange) {
                Object.entries(changes).forEach(([fieldKey, next]) => changePolicy(fieldKey, next, form));
                return;
            }
            Object.entries(changes).forEach(([fieldKey, next]) => {
                form.setFieldValue(['settings', fieldKey], next.value);
            });
            onPoliciesChange(changes);
        },
        [changePolicy, onPoliciesChange],
    );

    // One row for every switch on a tile: feature toggles and notification channels alike.
    const supportingTextFor = (row: {
        labelKey: string;
        policy: EffectivePolicy;
        note?: string;
        descriptionKey?: string;
    }) => {
        if (row.note) return row.note;
        const conflict = policyLevel === 'platform' ? null : conflictHintKey(row.policy);
        if (conflict) return t(`tenants.permissions.policy.source.${conflict}`);
        const descriptionKey = row.descriptionKey ?? featureDescriptionKey(row.labelKey);
        return descriptionKey ? t(descriptionKey) : undefined;
    };

    const toggleRow = (
        form: FormInstance,
        row: {
            setting: string;
            labelKey: string;
            policy: EffectivePolicy;
            disabled?: boolean;
            note?: string;
            descriptionKey?: string;
        },
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
            supportingText={supportingTextFor(row)}
            onChange={(next) => changePolicy(row.setting, next, form)}
        />
    );

    const participantRow = (
        form: FormInstance,
        toggle: ChatTypeParticipantToggle,
        getFieldValue: FormInstance['getFieldValue'],
        audience: 'asker' | 'consultant' = 'asker',
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
            descriptionKey: participantDescriptionKey(audience, toggle.labelKey),
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
                {card.notifications?.toggles.map((toggle) =>
                    participantRow(form, toggle, getFieldValue, card.notifications?.audience),
                )}
            </div>
        );
    };

    const settingsFallback = initialValues.settings as Record<string, unknown> | undefined;

    // ORISO-Admin#1558: what a folded tile still says: on or off, how many extra features, the case sharing.
    const tileSummary = (
        card: ChatTypeCardDef,
        getFieldValue: FormInstance['getFieldValue'],
        masterEnabled: boolean,
    ) => {
        if (!masterEnabled) return t('tenants.permissions.card.summary.off');
        const available = card.toggles.filter((toggle) => !unavailableCapabilityHintKey(toggle.requiresCapability));
        const on = available.filter(
            (toggle) => policyFor(toggle.field[1], getFieldValue(toggle.field)).value !== false,
        ).length;
        const parts = [
            available.length > 0
                ? t('tenants.permissions.card.summary.on', { count: on, total: available.length })
                : t('tenants.permissions.card.summary.onPlain'),
        ];
        if (card.key === 'oneOnOne' && caseSharing?.policy) {
            parts.push(t(`tenants.permissions.caseSharing.summary.${caseSharing.policy.value}`));
        }
        return parts.join(' · ');
    };

    const featureToggles = (
        form: FormInstance,
        card: ChatTypeCardDef,
        getFieldValue: FormInstance['getFieldValue'],
        masterEnabled: boolean,
    ) => (
        <>
            <div className={styles.togglesList}>
                {card.toggles.map((toggle) => {
                    const unavailableHintKey = unavailableCapabilityHintKey(toggle.requiresCapability);
                    const disabledByMaster = isSubToggleDisabled(card, toggle.field, masterEnabled);
                    const disabledHintKey =
                        unavailableHintKey || (disabledByMaster ? 'tenants.permissions.feature.requiresMaster' : null);
                    return toggleRow(form, {
                        setting: toggle.field[1],
                        labelKey: toggle.labelKey,
                        // Nothing implements it yet: locked off.
                        policy: unavailableHintKey
                            ? { value: false, mode: 'ENFORCED', inherited: true }
                            : policyFor(toggle.field[1], getFieldValue(toggle.field)),
                        disabled: Boolean(unavailableHintKey) || disabledByMaster,
                        note: disabledHintKey
                            ? t(unavailableHintKey ? 'tenants.permissions.feature.notYetAvailable' : disabledHintKey)
                            : undefined,
                    });
                })}
            </div>
            {/* The reason is long: below the cards, so one card does not stretch the row. */}
            {[
                ...new Set(
                    card.toggles.flatMap((toggle) => [
                        unavailableCapabilityHintKey(toggle.requiresCapability),
                        toggle.appOnly ? APP_ONLY_HINT_KEY : null,
                    ]),
                ),
            ]
                .filter(Boolean)
                .map((hintKey) => (
                    <p key={hintKey} className={styles.cardDescriptionSecondary}>
                        {t(hintKey as string)}
                    </p>
                ))}
        </>
    );

    const masterRow = (form: FormInstance, card: ChatTypeCardDef, getFieldValue: FormInstance['getFieldValue']) => {
        const { masterField } = card;
        return (
            <div className={styles.masterRow}>
                {masterField ? (
                    <PermissionPolicyControl
                        featureKey={masterField[1]}
                        label={t('tenants.permissions.card.activated')}
                        level={policyLevel}
                        policy={policyFor(masterField[1], getFieldValue(masterField))}
                        pending={policyPending(masterField[1])}
                        onChange={(next) => changePolicy(masterField[1], next, form)}
                    />
                ) : (
                    <>
                        <span className={styles.masterLabel}>{t('tenants.permissions.card.activated')}</span>
                        <span className={styles.masterRowPlaceholder} aria-hidden>
                            —
                        </span>
                    </>
                )}
            </div>
        );
    };

    /**
     * One conversation-type tile. #1558: it folds up to a header with a short summary (as on the
     * Legal page), and each topic sits in a section of its own.
     */
    const renderTile = (
        form: FormInstance,
        card: ChatTypeCardDef,
        getFieldValue: FormInstance['getFieldValue'],
        masterEnabled: boolean,
    ) => {
        const CardIcon = card.Icon;
        const title = typeNames?.[card.key] ?? t(card.titleKey);
        const showLinks = card.key === 'liveChat' && Boolean(liveChatLinks);
        const help = CONVERSATION_HELP[card.key];
        return (
            <div
                className={styles.chatTypeTile}
                data-testid={`chat-type-card-${card.key}`}
                data-search-tile={card.titleKey}
            >
                <CollapsibleTile
                    icon={<CardIcon width={32} height={32} />}
                    title={title}
                    onIconClick={onEditTypeAppearance ? () => onEditTypeAppearance(card.key) : undefined}
                    iconLabel={t('tenants.permissions.card.editAppearance', { name: title })}
                    status={tileSummary(card, getFieldValue, masterEnabled)}
                    defaultOpen
                >
                    <div className={styles.tileIntro}>
                        {masterRow(form, card, getFieldValue)}
                        {help && <TileHelpButton topic={help} tileTitle={title} tileIcon={<CardIcon />} />}
                    </div>
                    <div className={showLinks ? styles.tileColumns : styles.tileSections}>
                        {(showLinks ||
                            (card.key === 'groupInternal' && recipientScope && policyLevel !== 'agency')) && (
                            <div className={styles.tileSections}>
                                {card.key === 'groupInternal' && recipientScope && policyLevel !== 'agency' && (
                                    <RecipientScopeControl
                                        {...recipientScope}
                                        asPanel
                                        level={policyLevel}
                                        disabled={!masterEnabled}
                                    />
                                )}
                                {showLinks && (
                                    <TileSections.Section
                                        wide
                                        id={`${card.key}-liveChatLinks`}
                                        title={t('liveChatLinks.title')}
                                    >
                                        {liveChatLinks}
                                    </TileSections.Section>
                                )}
                            </div>
                        )}
                        <div className={styles.tileSections}>
                            {card.toggles.length > 0 && (
                                <TileSections.Section
                                    wide
                                    id={`${card.key}-features`}
                                    title={t('tenants.permissions.card.configurableFeatures')}
                                    titleAction={<SectionHelp topic={CHAT_TYPE_HELP[card.key]} />}
                                    collapsible
                                >
                                    {featureToggles(form, card, getFieldValue, masterEnabled)}
                                </TileSections.Section>
                            )}

                            {card.key === 'oneOnOne' && caseSharing && (
                                <CaseSharingSection
                                    policy={caseSharing.policy}
                                    level={policyLevel}
                                    onChange={caseSharing.onChange}
                                    disabledReason={caseSharing.disabledReason}
                                    bothActive={caseSharing.bothActive}
                                    handoverSettings={
                                        <CaseHandoverCard
                                            embedded
                                            tenantId={caseHandoverTenantId}
                                            tenantPending={caseHandoverTenantPending}
                                            policyLevel={policyLevel}
                                            permissionPolicies={permissionPolicies}
                                            pendingPolicyFields={pendingPolicyFields}
                                        />
                                    }
                                />
                            )}

                            {/* ORISO-Admin#1577: Team-Chat coordinates an open enquiry, so it belongs here. */}
                            {card.key === 'oneOnOne' && (
                                <TileSections.Section
                                    wide
                                    id={`${card.key}-teamChat`}
                                    title={t(TEAM_FUNCTIONS.chat.nameKey)}
                                    note={t('tenants.permissions.teamChat.note')}
                                    titleAction={<SectionHelp topic={TEAM_CHAT_HELP} />}
                                    collapsible
                                >
                                    <div className={styles.togglesList}>
                                        <TraegerSettingCard
                                            field={TRAEGER_ONLY_SETTINGS.teamChat}
                                            labelKey={TEAM_FUNCTIONS.chat.nameKey}
                                            descriptionKey={TEAM_FUNCTIONS.chat.descriptionKey}
                                            settings={traegerSettings}
                                        />
                                    </div>
                                </TileSections.Section>
                            )}

                            {/* ORISO-Admin#1242: a direct link opens a 1:1 session. */}
                            {card.key === 'oneOnOne' && (
                                <TileSections.Section
                                    wide
                                    id={`${card.key}-directInvite`}
                                    title={t('tenants.permissions.directInvite.title')}
                                    note={t('tenants.permissions.directInvite.description')}
                                    titleAction={<SectionHelp topic={directInviteHelp} />}
                                    collapsible
                                >
                                    <DirectInviteSection
                                        restrictedFields={restrictedFields}
                                        policyLevel={policyLevel}
                                        permissionPolicies={permissionPolicies}
                                        fallbackValues={settingsFallback}
                                        traegerPolicies={traegerDirectInvitePolicies}
                                        traegerPoliciesStatus={traegerChannelPoliciesStatus}
                                        pendingPolicyFields={pendingPolicyFields}
                                        onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                    />
                                </TileSections.Section>
                            )}

                            {/* ORISO-UserService#1662: no Beratungsstelle value exists. */}
                            {card.key === 'oneOnOne' && policyLevel !== 'agency' && (
                                <TileSections.Section
                                    wide
                                    id={`${card.key}-guestAccounts`}
                                    title={t('tenants.permissions.guestAccountModes.title')}
                                    titleAction={<SectionHelp topic={GUEST_ACCOUNT_HELP} />}
                                    collapsible
                                    note={t('tenants.permissions.guestAccountModes.description')}
                                >
                                    <GuestAccountModeSection
                                        restrictedFields={restrictedFields}
                                        policyLevel={policyLevel}
                                        permissionPolicies={permissionPolicies}
                                        fallbackValues={settingsFallback}
                                        ownSettings={ownSettings}
                                        pendingPolicyFields={pendingPolicyFields}
                                        onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                        onPoliciesChange={(changes) => changePolicies(changes, form)}
                                    />
                                </TileSections.Section>
                            )}

                            {card.key === 'oneOnOne' && (
                                <TileSections.Section
                                    wide
                                    id={`${card.key}-askerAccount`}
                                    title={t('tenants.permissions.asker.title')}
                                    titleAction={<SectionHelp topic={ASKER_HELP} />}
                                    collapsible
                                    note={t('tenants.permissions.asker.sectionDescription')}
                                >
                                    <AskerPermissionsCard
                                        embedded
                                        restrictedFields={restrictedFields}
                                        policyLevel={policyLevel}
                                        permissionPolicies={permissionPolicies}
                                        fallbackValues={settingsFallback}
                                        pendingPolicyFields={pendingPolicyFields}
                                        onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                        channelToggles={hiddenTileChannelToggles}
                                    />
                                </TileSections.Section>
                            )}

                            {card.notifications && (
                                <TileSections.Section
                                    wide
                                    id={`${card.key}-participants`}
                                    titleAction={
                                        card.notifications.audience === 'asker' && (
                                            <SectionHelp topic={askerAccountHelp} />
                                        )
                                    }
                                    collapsible
                                    title={t(
                                        `tenants.permissions.card.notifications.${card.notifications.audience}Title`,
                                    )}
                                    note={
                                        channelsSetOnTraeger
                                            ? t('tenants.permissions.card.notifications.setOnTraeger')
                                            : undefined
                                    }
                                >
                                    {participantSwitches(form, card, getFieldValue)}
                                </TileSections.Section>
                            )}
                        </div>
                    </div>
                </CollapsibleTile>
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
                    <PermissionsIntro
                        scopeNote={introScopeNote}
                        cards={cardsToRender.map((card) => ({
                            key: card.key,
                            name: typeNames?.[card.key] ?? t(card.titleKey),
                        }))}
                    />
                    <CardGrid raster>
                        {/* ORISO-Admin#602: these two settings govern the account and the handover, so they
                            come before the per-chat-type feature cards. #1558: with the case-sharing
                            choice the handover lives on the Mailberatung tile instead. */}
                        {!caseSharing && (
                            <CardGrid.Item span={showsHandoverRules || askerInMailTile ? 3 : 1}>
                                <CaseHandoverCard
                                    tenantId={caseHandoverTenantId}
                                    tenantPending={caseHandoverTenantPending}
                                    policyLevel={policyLevel}
                                    permissionPolicies={permissionPolicies}
                                    pendingPolicyFields={pendingPolicyFields}
                                    onFeaturePolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                />
                            </CardGrid.Item>
                        )}
                        {!askerInMailTile && (
                            <CardGrid.Item span={caseSharing || showsHandoverRules ? 3 : 2}>
                                <AskerPermissionsCard
                                    restrictedFields={restrictedFields}
                                    policyLevel={policyLevel}
                                    permissionPolicies={permissionPolicies}
                                    fallbackValues={settingsFallback}
                                    pendingPolicyFields={pendingPolicyFields}
                                    onPolicyChange={(fieldKey, next) => changePolicy(fieldKey, next, form)}
                                    channelToggles={hiddenTileChannelToggles}
                                />
                            </CardGrid.Item>
                        )}
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
                                        return renderTile(form, card, getFieldValue, masterEnabled);
                                    }}
                                </Form.Item>
                            </CardGrid.Item>
                        ))}
                        {/* ORISO-Admin#1577: supervision chats, after the conversation types. */}
                        <CardGrid.Item span={3}>
                            <SupervisionTile
                                level={policyLevel}
                                policyOf={(field) => policyFor(field, form.getFieldValue(['settings', field]))}
                                pending={policyPending}
                                onChange={(field, next) => changePolicy(field, next, form)}
                            />
                        </CardGrid.Item>
                        {calendar && policyLevel !== 'agency' && (
                            <CardGrid.Item span={2}>
                                <CalendarCard {...calendar} level={policyLevel} />
                            </CardGrid.Item>
                        )}
                    </CardGrid>
                </div>
            )}
        </CardEditable>
    );
};
