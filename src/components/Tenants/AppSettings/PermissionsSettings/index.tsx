import { Form, FormInstance } from 'antd';
import { FunctionComponent, SVGProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from '../../../../hooks/useTenantAdminControlsMutation.hook';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { PermissionToggleVisibility } from '../../../../types/PermissionToggleVisibility';
import { TenantAdminControls } from '../../../../types/TenantAdminControls';
import { ReactComponent as ArrowRightIcon } from '../../../../resources/img/svg/permissions/arrow_right.svg';
import { ReactComponent as OneOnOneIcon } from '../../../../resources/img/svg/permissions/one_on_one.svg';
import { ReactComponent as LiveChatIcon } from '../../../../resources/img/svg/permissions/live_chat.svg';
import { ReactComponent as GroupIcon } from '../../../../resources/img/svg/permissions/group.svg';
import { ReactComponent as GroupInternalIcon } from '../../../../resources/img/svg/permissions/group_internal.svg';
import { EditButton } from '../../../EditButton';
import { M3Switch } from '../../../M3Switch';
import styles from './styles.module.scss';

let MASTER_TOGGLE_CHILDREN: Record<string, string[]> = {};
let syncMasterChildTogglesInForm: (form: FormInstance, fieldPath: string | string[], value: boolean) => void;

type ToggleAfterChangeHandler = (
    fieldPath: string | string[],
    value: boolean,
    currentFormData?: { settings?: Record<string, unknown> },
) => void;

const buildTogglePayload = (fieldPath: string | string[], value: boolean): Record<string, unknown> => {
    const path = Array.isArray(fieldPath) ? fieldPath : [fieldPath];
    const fieldKey = path[path.length - 1] as string;

    const settings: Record<string, boolean> = { [fieldKey]: value };

    if (!value && MASTER_TOGGLE_CHILDREN[fieldKey]) {
        MASTER_TOGGLE_CHILDREN[fieldKey].forEach((childKey) => {
            settings[childKey] = false;
        });
    }

    if (path.length === 1) {
        return settings;
    }

    return path.slice(0, -1).reduceRight<unknown>((acc, key) => ({ [key]: acc }), settings) as Record<string, unknown>;
};

type CheckToggleInnerProps = {
    checked?: boolean;
    onChange?: (value: boolean) => void;
    disabled?: boolean;
    label: string;
    fieldName: string | string[];
    onAfterChange?: ToggleAfterChangeHandler;
};

const CheckToggleInner = ({ checked, onChange, disabled, label, fieldName, onAfterChange }: CheckToggleInnerProps) => {
    const form = Form.useFormInstance();

    const handleToggle = () => {
        if (disabled) return;
        const newValue = !checked;
        onChange?.(newValue);
        syncMasterChildTogglesInForm(form, fieldName, newValue);
        onAfterChange?.(fieldName, newValue, form.getFieldsValue(true));
    };
    return <M3Switch checked={checked} label={label} disabled={disabled} onChange={handleToggle} />;
};

type CheckToggleProps = {
    name: string | string[];
    label: string;
    disabled?: boolean;
    onAfterChange?: ToggleAfterChangeHandler;
};

const CheckToggle = ({ name, label, disabled, onAfterChange }: CheckToggleProps) => (
    <Form.Item name={name} valuePropName="checked" noStyle>
        <CheckToggleInner label={label} disabled={disabled} fieldName={name} onAfterChange={onAfterChange} />
    </Form.Item>
);

interface PermissionsSettingsCommonArgs {
    tenantId: string;
    /** Hide chat-type cards by key (e.g. liveChat on super-admin settings — managed under Global Configs). */
    excludeCardKeys?: Array<'oneOnOne' | 'liveChat' | 'group' | 'groupInternal'>;
}

interface PermissionsSettingsArgs extends PermissionsSettingsCommonArgs {
    superAdminControlMode?: boolean;
}

const DEFAULT_PERMISSION_SETTINGS = {
    featureAnonymousChatEnabled: true,
    featureGroupChatV2Enabled: true,
    featureCallsEnabled: true,
    featureSupervisionEnabled: true,
    featureSupervisionAnonymousChatsEnabled: true,
    featureSupervisionOneOnOneChatsEnabled: true,
    featureAudioCallsEnabled: true,
    featureAudioCallsAnonymousChatsEnabled: true,
    featureAudioCallsOneOnOneChatsEnabled: true,
    featureAudioCallsGroupChatsEnabled: true,
    featureAudioCallsSupervisionChatsEnabled: true,
    featureVideoCallsEnabled: true,
    featureVideoCallsAnonymousChatsEnabled: true,
    featureVideoCallsOneOnOneChatsEnabled: true,
    featureVideoCallsGroupChatsEnabled: true,
    featureVideoCallsSupervisionChatsEnabled: true,
    featureThreadsEnabled: true,
    featureThreadsAnonymousChatsEnabled: true,
    featureThreadsGroupChatsEnabled: true,
    featureThreadsOneOnOneEnabled: true,
    featureThreadsSupervisionChatsEnabled: true,
    featureVoiceMessagesEnabled: true,
    featureVoiceMessagesAnonymousChatsEnabled: true,
    featureVoiceMessagesOneOnOneChatsEnabled: true,
    featureVoiceMessagesGroupChatsEnabled: true,
    featureVoiceMessagesSupervisionChatsEnabled: true,
} as const;

const PLATFORM_TOGGLE_FIELDS: Record<keyof PermissionToggleVisibility, string[]> = {
    anonymousChat: [
        'featureAnonymousChatEnabled',
        'featureVideoCallsAnonymousChatsEnabled',
        'featureAudioCallsAnonymousChatsEnabled',
        'featureVoiceMessagesAnonymousChatsEnabled',
        'featureThreadsAnonymousChatsEnabled',
        'featureSupervisionAnonymousChatsEnabled',
    ],
    groupChat: [
        'featureGroupChatV2Enabled',
        'featureVideoCallsGroupChatsEnabled',
        'featureAudioCallsGroupChatsEnabled',
        'featureVoiceMessagesGroupChatsEnabled',
        'featureThreadsGroupChatsEnabled',
    ],
    calls: ['featureCallsEnabled'],
    supervision: [
        'featureSupervisionEnabled',
        // 'featureSupervisionAnonymousChatsEnabled',
        // 'featureSupervisionOneOnOneChatsEnabled',
        'featureVideoCallsSupervisionChatsEnabled',
        'featureAudioCallsSupervisionChatsEnabled',
        'featureVoiceMessagesSupervisionChatsEnabled',
        'featureThreadsSupervisionChatsEnabled',
    ],
    supervisionAnonymousChats: ['featureSupervisionAnonymousChatsEnabled'],
    supervisionOneOnOneChats: ['featureSupervisionOneOnOneChatsEnabled'],
    audioCalls: [
        'featureAudioCallsEnabled',
        'featureAudioCallsAnonymousChatsEnabled',
        'featureAudioCallsOneOnOneChatsEnabled',
        'featureAudioCallsGroupChatsEnabled',
        'featureAudioCallsSupervisionChatsEnabled',
    ],
    audioCallsAnonymousChats: ['featureAudioCallsAnonymousChatsEnabled'],
    audioCallsOneOnOneChats: ['featureAudioCallsOneOnOneChatsEnabled'],
    audioCallsGroupChats: ['featureAudioCallsGroupChatsEnabled'],
    audioCallsSupervisionChats: ['featureAudioCallsSupervisionChatsEnabled'],
    videoCalls: [
        'featureVideoCallsEnabled',
        'featureVideoCallsAnonymousChatsEnabled',
        'featureVideoCallsOneOnOneChatsEnabled',
        'featureVideoCallsGroupChatsEnabled',
        'featureVideoCallsSupervisionChatsEnabled',
    ],
    videoCallsAnonymousChats: ['featureVideoCallsAnonymousChatsEnabled'],
    videoCallsOneOnOneChats: ['featureVideoCallsOneOnOneChatsEnabled'],
    videoCallsGroupChats: ['featureVideoCallsGroupChatsEnabled'],
    videoCallsSupervisionChats: ['featureVideoCallsSupervisionChatsEnabled'],
    threads: [
        'featureThreadsEnabled',
        'featureThreadsAnonymousChatsEnabled',
        'featureThreadsOneOnOneEnabled',
        'featureThreadsGroupChatsEnabled',
        'featureThreadsSupervisionChatsEnabled',
    ],
    threadsAnonymousChats: ['featureThreadsAnonymousChatsEnabled'],
    threadsOneOnOneChats: ['featureThreadsOneOnOneEnabled'],
    threadsGroupChats: ['featureThreadsGroupChatsEnabled'],
    threadsSupervisionChats: ['featureThreadsSupervisionChatsEnabled'],
    voiceMessages: [
        'featureVoiceMessagesEnabled',
        'featureVoiceMessagesAnonymousChatsEnabled',
        'featureVoiceMessagesOneOnOneChatsEnabled',
        'featureVoiceMessagesGroupChatsEnabled',
        'featureVoiceMessagesSupervisionChatsEnabled',
    ],
    voiceMessagesAnonymousChats: ['featureVoiceMessagesAnonymousChatsEnabled'],
    voiceMessagesOneOnOneChats: ['featureVoiceMessagesOneOnOneChatsEnabled'],
    voiceMessagesGroupChats: ['featureVoiceMessagesGroupChatsEnabled'],
    voiceMessagesSupervisionChats: ['featureVoiceMessagesSupervisionChatsEnabled'],
};

const getForcedOffFields = (toggles?: PermissionToggleVisibility) => {
    if (!toggles) return new Set<string>();

    return Object.entries(toggles).reduce((fields, [toggleKey, enabled]) => {
        if (enabled === false) {
            const platformFields = PLATFORM_TOGGLE_FIELDS[toggleKey as keyof PermissionToggleVisibility];
            if (platformFields) {
                platformFields.forEach((field) => fields.add(field));
                return fields;
            }
        }
        return fields;
    }, new Set<string>());
};

const applyForcedOffFields = (settings, forcedOffFields: Set<string>) => {
    if (forcedOffFields.size === 0) return settings;

    const nextSettings = { ...(settings ?? {}) };
    forcedOffFields.forEach((field) => {
        nextSettings[field] = false;
    });
    return nextSettings;
};

/** Maps allowedPermissionToggles to feature settings for super-admin display and persist. */
const applyVisibleTogglesAsValues = (visibleToggles?: PermissionToggleVisibility) => {
    const settings: Record<string, boolean> = { ...DEFAULT_PERMISSION_SETTINGS };
    if (!visibleToggles) {
        return settings;
    }

    (Object.entries(PLATFORM_TOGGLE_FIELDS) as [keyof PermissionToggleVisibility, string[]][]).forEach(
        ([toggleKey, fields]) => {
            if (visibleToggles[toggleKey] === undefined) {
                return;
            }

            const enabled = visibleToggles[toggleKey] !== false;
            fields.forEach((field) => {
                settings[field] = enabled;
            });
        },
    );

    return settings;
};

const syncMasterTogglesToTenantAdminControls = (formData) => {
    const next = { ...formData, settings: { ...(formData?.settings ?? {}) } };
    const { settings } = next;
    const isEnabled = (key: string) => settings?.[key] !== false;
    const anonymousEnabled = isEnabled('featureAnonymousChatEnabled');
    const groupEnabled = isEnabled('featureGroupChatV2Enabled');
    const oneOnOneEnabled = isEnabled('featureCallsEnabled');
    const supervisionEnabled = isEnabled('featureSupervisionEnabled');

    settings.tenantAdminControls = {
        ...(settings.tenantAdminControls ?? {}),
        allowedPermissionToggles: {
            anonymousChat: anonymousEnabled,
            groupChat: groupEnabled,
            calls: oneOnOneEnabled,
            supervision: supervisionEnabled,
            supervisionAnonymousChats: anonymousEnabled && isEnabled('featureSupervisionAnonymousChatsEnabled'),
            supervisionOneOnOneChats: oneOnOneEnabled && isEnabled('featureSupervisionOneOnOneChatsEnabled'),
            audioCalls: isEnabled('featureAudioCallsEnabled'),
            audioCallsAnonymousChats: anonymousEnabled && isEnabled('featureAudioCallsAnonymousChatsEnabled'),
            audioCallsOneOnOneChats: oneOnOneEnabled && isEnabled('featureAudioCallsOneOnOneChatsEnabled'),
            audioCallsGroupChats: groupEnabled && isEnabled('featureAudioCallsGroupChatsEnabled'),
            audioCallsSupervisionChats: isEnabled('featureAudioCallsSupervisionChatsEnabled'),
            videoCalls: isEnabled('featureVideoCallsEnabled'),
            videoCallsAnonymousChats: anonymousEnabled && isEnabled('featureVideoCallsAnonymousChatsEnabled'),
            videoCallsOneOnOneChats: oneOnOneEnabled && isEnabled('featureVideoCallsOneOnOneChatsEnabled'),
            videoCallsGroupChats: groupEnabled && isEnabled('featureVideoCallsGroupChatsEnabled'),
            videoCallsSupervisionChats: supervisionEnabled && isEnabled('featureVideoCallsSupervisionChatsEnabled'),
            threads: isEnabled('featureThreadsEnabled'),
            threadsAnonymousChats: anonymousEnabled && isEnabled('featureThreadsAnonymousChatsEnabled'),
            threadsOneOnOneChats: oneOnOneEnabled && isEnabled('featureThreadsOneOnOneEnabled'),
            threadsGroupChats: groupEnabled && isEnabled('featureThreadsGroupChatsEnabled'),
            threadsSupervisionChats: supervisionEnabled && isEnabled('featureThreadsSupervisionChatsEnabled'),
            voiceMessages: isEnabled('featureVoiceMessagesEnabled'),
            voiceMessagesAnonymousChats: anonymousEnabled && isEnabled('featureVoiceMessagesAnonymousChatsEnabled'),
            voiceMessagesOneOnOneChats: oneOnOneEnabled && isEnabled('featureVoiceMessagesOneOnOneChatsEnabled'),
            voiceMessagesGroupChats: groupEnabled && isEnabled('featureVoiceMessagesGroupChatsEnabled'),
            voiceMessagesSupervisionChats:
                supervisionEnabled && isEnabled('featureVoiceMessagesSupervisionChatsEnabled'),
        },
    };
    return next;
};

const buildTenantAdminControlsPayload = (
    formData: { settings?: Record<string, unknown> },
    existingToggles?: PermissionToggleVisibility,
    permissionsPageEnabled = true,
): TenantAdminControls => {
    const synced = syncMasterTogglesToTenantAdminControls(formData);
    const syncedControls = synced.settings?.tenantAdminControls as TenantAdminControls | undefined;

    return {
        permissionsPageEnabled,
        allowedPermissionToggles: {
            ...existingToggles,
            ...syncedControls?.allowedPermissionToggles,
        },
    };
};

type ChatTypeCardDef = {
    key: 'oneOnOne' | 'liveChat' | 'group' | 'groupInternal';
    titleKey: string;
    descriptionKey: string;
    Icon: FunctionComponent<SVGProps<SVGSVGElement>>;
    masterField?: string[];
    toggles: Array<{
        labelKey: string;
        field: string[];
    }>;
};

const CHAT_TYPE_CARDS: ChatTypeCardDef[] = [
    {
        key: 'oneOnOne',
        titleKey: 'tenants.permissions.card.oneOnOne.title',
        descriptionKey: 'tenants.permissions.card.oneOnOne.description',
        Icon: OneOnOneIcon,
        masterField: ['settings', 'featureCallsEnabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesOneOnOneChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsOneOnOneEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.supervision',
                field: ['settings', 'featureSupervisionOneOnOneChatsEnabled'],
            },
        ],
    },
    {
        key: 'liveChat',
        titleKey: 'tenants.permissions.card.liveChat.title',
        descriptionKey: 'tenants.permissions.card.liveChat.description',
        Icon: LiveChatIcon,
        masterField: ['settings', 'featureAnonymousChatEnabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsAnonymousChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.supervision',
                field: ['settings', 'featureSupervisionAnonymousChatsEnabled'],
            },
        ],
    },
    {
        key: 'group',
        titleKey: 'tenants.permissions.card.group.title',
        descriptionKey: 'tenants.permissions.card.group.description',
        Icon: GroupIcon,
        masterField: ['settings', 'featureGroupChatV2Enabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesGroupChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsGroupChatsEnabled'],
            },
        ],
    },
    {
        key: 'groupInternal',
        titleKey: 'tenants.permissions.card.groupInternal.title',
        descriptionKey: 'tenants.permissions.card.groupInternal.description',
        Icon: GroupInternalIcon,
        masterField: ['settings', 'featureSupervisionEnabled'],
        toggles: [
            {
                labelKey: 'tenants.permissions.feature.videoCalls',
                field: ['settings', 'featureVideoCallsSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.audioCalls',
                field: ['settings', 'featureAudioCallsSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.voiceMessages',
                field: ['settings', 'featureVoiceMessagesSupervisionChatsEnabled'],
            },
            {
                labelKey: 'tenants.permissions.feature.threads',
                field: ['settings', 'featureThreadsSupervisionChatsEnabled'],
            },
        ],
    },
];

MASTER_TOGGLE_CHILDREN = CHAT_TYPE_CARDS.reduce((acc, card) => {
    if (!card.masterField) return acc;
    const masterKey = card.masterField[1];
    acc[masterKey] = card.toggles.map((toggle) => toggle.field[1]);
    return acc;
}, {} as Record<string, string[]>);

syncMasterChildTogglesInForm = (form, fieldPath, value) => {
    if (value) return;
    const path = Array.isArray(fieldPath) ? fieldPath : [fieldPath];
    const fieldKey = path[path.length - 1] as string;
    const children = MASTER_TOGGLE_CHILDREN[fieldKey];
    if (!children?.length) return;

    const prefix = path.slice(0, -1);
    form.setFields(children.map((childKey) => ({ name: [...prefix, childKey], value: false })));
};

const ONE_ON_ONE_CALL_TOGGLE_FIELDS = new Set([
    'featureVideoCallsOneOnOneChatsEnabled',
    'featureAudioCallsOneOnOneChatsEnabled',
]);

const isSubToggleDisabled = (card: ChatTypeCardDef, toggleField: string[], masterEnabled: boolean): boolean => {
    const fieldKey = toggleField[1];
    if (card.key === 'oneOnOne' && ONE_ON_ONE_CALL_TOGGLE_FIELDS.has(fieldKey)) {
        return !masterEnabled;
    }
    if (card.masterField) {
        return !masterEnabled;
    }
    return false;
};

type PermissionsSettingsViewProps = {
    tenantId: string;
    disableSubTogglesWhenMasterOff: boolean;
    excludeCardKeys?: PermissionsSettingsCommonArgs['excludeCardKeys'];
    isLoading: boolean;
    initialValues: Record<string, unknown>;
    formStateKey: string;
    restrictedFields: Set<string>;
    onToggleUpdate: ToggleAfterChangeHandler;
    onSave: (formData: unknown) => void;
};

const PermissionsSettingsView = ({
    tenantId,
    disableSubTogglesWhenMasterOff,
    excludeCardKeys,
    isLoading,
    initialValues,
    formStateKey,
    restrictedFields,
    onToggleUpdate,
    onSave,
}: PermissionsSettingsViewProps) => {
    const { t } = useTranslation();
    const gridRef = useRef<HTMLDivElement | null>(null);
    const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
    const cardsToRender = excludeCardKeys?.length
        ? CHAT_TYPE_CARDS.filter((card) => !excludeCardKeys.includes(card.key))
        : CHAT_TYPE_CARDS;
    const updateScrollState = useCallback(() => {
        const el = gridRef.current;
        if (!el) return;

        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        const canScroll = maxScrollLeft > 1;
        const canScrollLeft = canScroll && el.scrollLeft > 1;
        const canScrollRight = canScroll && el.scrollLeft < maxScrollLeft - 1;

        setScrollState((previous) => {
            if (previous.canScrollLeft === canScrollLeft && previous.canScrollRight === canScrollRight) {
                return previous;
            }

            return { canScrollLeft, canScrollRight };
        });
    }, []);

    const scrollByCard = useCallback(
        (dir: 'left' | 'right') => {
            const el = gridRef.current;
            if (!el) return;
            const firstCard = el.querySelector(`.${styles.chatTypeCard}`) as HTMLElement | null;
            const computedStyle = window.getComputedStyle(el);
            const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap) || 48;
            const step = firstCard ? firstCard.offsetWidth + gap : el.clientWidth * 0.9;
            el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
            window.setTimeout(updateScrollState, 260);
        },
        [updateScrollState],
    );

    useEffect(() => {
        const el = gridRef.current;
        const initialCheck = window.setTimeout(updateScrollState, 0);
        const settledCheck = window.setTimeout(updateScrollState, 250);

        if (!el) {
            return () => {
                window.clearTimeout(initialCheck);
                window.clearTimeout(settledCheck);
            };
        }

        updateScrollState();

        const handleScroll = () => updateScrollState();
        const handleResize = () => updateScrollState();
        const observer =
            typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => updateScrollState());

        el.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);
        observer?.observe(el);
        Array.from(el.children).forEach((child) => observer?.observe(child));

        return () => {
            window.clearTimeout(initialCheck);
            window.clearTimeout(settledCheck);
            el.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            observer?.disconnect();
        };
    }, [cardsToRender.length, isLoading, updateScrollState]);

    return (
        <CardEditable
            key={`permissions-${tenantId}-${formStateKey}`}
            className={styles.transparentCardWrapper}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={onSave}
        >
            {({ editing, startEditing }) => (
                <div className={styles.cardGridOuter}>
                    <button
                        type="button"
                        className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
                        onClick={() => scrollByCard('left')}
                        disabled={!scrollState.canScrollLeft}
                        aria-label="Previous card"
                    >
                        <ArrowRightIcon className={styles.carouselArrowIcon} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
                        onClick={() => scrollByCard('right')}
                        disabled={!scrollState.canScrollRight}
                        aria-label="Next card"
                    >
                        <ArrowRightIcon className={styles.carouselArrowIcon} aria-hidden />
                    </button>
                    <div className={styles.cardGrid} ref={gridRef}>
                        {cardsToRender.map((card) => (
                            <Form.Item
                                key={card.key}
                                noStyle
                                shouldUpdate={(prev, curr) => {
                                    if (!card.masterField) return false;
                                    const [, masterKey] = card.masterField;
                                    return prev?.settings?.[masterKey] !== curr?.settings?.[masterKey];
                                }}
                            >
                                {({ getFieldValue }) => {
                                    const masterEnabled = card.masterField
                                        ? getFieldValue(card.masterField) !== false
                                        : true;
                                    const CardIcon = card.Icon;
                                    return (
                                        <div className={styles.chatTypeCard}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.cardIcon} aria-hidden>
                                                    <CardIcon width={40} height={40} />
                                                </span>
                                                <h3 className={styles.cardTitle}>{t(card.titleKey)}</h3>
                                            </div>

                                            <div className={styles.masterRow}>
                                                <span className={styles.masterLabel}>
                                                    {t('tenants.permissions.card.activated')}
                                                </span>
                                                {card.masterField ? (
                                                    <CheckToggle
                                                        name={card.masterField}
                                                        label={t('tenants.permissions.card.activated')}
                                                        disabled={restrictedFields.has(card.masterField[1])}
                                                        onAfterChange={onToggleUpdate}
                                                    />
                                                ) : (
                                                    <span className={styles.masterRowPlaceholder} aria-hidden>
                                                        —
                                                    </span>
                                                )}
                                            </div>

                                            <p className={styles.cardDescription}>
                                                <Trans
                                                    i18nKey={card.descriptionKey}
                                                    components={{
                                                        strong: <strong />,
                                                        small: <span className={styles.cardDescriptionSecondary} />,
                                                    }}
                                                />
                                            </p>

                                            <div className={styles.cardDivider} />

                                            <div className={styles.togglesSectionLabel}>
                                                {t('tenants.permissions.card.configurableFeatures')}
                                            </div>

                                            <div className={styles.togglesList}>
                                                {card.toggles.map((toggle) => (
                                                    <div key={toggle.field.join('.')} className={styles.toggleRow}>
                                                        <span className={styles.toggleLabel}>{t(toggle.labelKey)}</span>
                                                        <CheckToggle
                                                            name={toggle.field}
                                                            label={t(toggle.labelKey)}
                                                            disabled={
                                                                restrictedFields.has(toggle.field[1]) ||
                                                                (disableSubTogglesWhenMasterOff &&
                                                                    isSubToggleDisabled(
                                                                        card,
                                                                        toggle.field,
                                                                        masterEnabled,
                                                                    ))
                                                            }
                                                            onAfterChange={onToggleUpdate}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className={styles.cardFooterActions}>
                                                {!editing && (
                                                    <EditButton
                                                        className={styles.cardFooterEditButton}
                                                        onClick={startEditing}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        ))}
                    </div>
                </div>
            )}
        </CardEditable>
    );
};

const SuperAdminPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { t } = useTranslation();
    const { data: platformControls, isLoading } = useTenantAdminControls(true);
    const { mutate: updateTenantAdminControls } = useTenantAdminControlsMutation({ successMessageKey: false });

    const allowedPermissionToggles = platformControls?.allowedPermissionToggles;
    const restrictedFields = useMemo(() => new Set<string>(), []);

    const persistPlatformControls = useCallback(
        (formData: { settings?: Record<string, unknown> }) => {
            updateTenantAdminControls(
                buildTenantAdminControlsPayload(
                    formData,
                    allowedPermissionToggles,
                    platformControls?.permissionsPageEnabled ?? true,
                ),
            );
        },
        [updateTenantAdminControls, allowedPermissionToggles, platformControls?.permissionsPageEnabled, t],
    );

    const initialValues = useMemo(
        () => ({
            settings: applyVisibleTogglesAsValues(allowedPermissionToggles),
        }),
        [allowedPermissionToggles],
    );
    const formStateKey = 'platform';

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            persistPlatformControls({
                settings: {
                    ...applyVisibleTogglesAsValues(allowedPermissionToggles),
                    ...(currentFormData?.settings ?? {}),
                    ...toggleUpdate.settings,
                },
            });
        },
        [allowedPermissionToggles, persistPlatformControls],
    );

    const handleSave = useCallback(
        (formData: unknown) => {
            persistPlatformControls(formData as { settings?: Record<string, unknown> });
        },
        [persistPlatformControls],
    );

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            disableSubTogglesWhenMasterOff={false}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            onSave={handleSave}
        />
    );
};

const TenantPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { data: tenantData, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    const allowedPermissionToggles = tenantData?.settings?.tenantAdminControls?.allowedPermissionToggles;
    const restrictedFields = useMemo(() => getForcedOffFields(allowedPermissionToggles), [allowedPermissionToggles]);

    const initialValues = useMemo(
        () => ({
            ...tenantData,
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...applyForcedOffFields(tenantData?.settings ?? {}, restrictedFields),
            },
        }),
        [tenantData, restrictedFields],
    );

    const formStateKey = useMemo(() => Array.from(restrictedFields).sort().join('|'), [restrictedFields]);

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            if (!tenantData) return;

            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            updateTenantSettings({
                settings: applyForcedOffFields(
                    {
                        ...tenantData.settings,
                        ...(currentFormData?.settings ?? {}),
                        ...toggleUpdate.settings,
                    },
                    restrictedFields,
                ),
            });
        },
        [tenantData, updateTenantSettings, restrictedFields],
    );

    const handleSave = useCallback(
        (formData: unknown) => {
            const savedFormData = formData as { settings?: Record<string, unknown> };
            updateTenantSettings({
                settings: applyForcedOffFields(savedFormData.settings, restrictedFields),
            });
        },
        [updateTenantSettings, restrictedFields],
    );

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            disableSubTogglesWhenMasterOff
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            onSave={handleSave}
        />
    );
};

export const PermissionsSettings = ({ superAdminControlMode = false, ...props }: PermissionsSettingsArgs) =>
    superAdminControlMode ? <SuperAdminPermissionsSettings {...props} /> : <TenantPermissionsSettings {...props} />;
