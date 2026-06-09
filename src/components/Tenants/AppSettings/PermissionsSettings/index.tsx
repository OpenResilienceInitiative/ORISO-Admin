import { Form } from 'antd';
import { FunctionComponent, SVGProps, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { ReactComponent as OneOnOneIcon } from '../../../../resources/img/svg/permissions/one_on_one.svg';
import { ReactComponent as LiveChatIcon } from '../../../../resources/img/svg/permissions/live_chat.svg';
import { ReactComponent as GroupIcon } from '../../../../resources/img/svg/permissions/group.svg';
import { ReactComponent as GroupInternalIcon } from '../../../../resources/img/svg/permissions/group_internal.svg';
import styles from './styles.module.scss';

type CheckToggleInnerProps = {
    checked?: boolean;
    onChange?: (value: boolean) => void;
    disabled?: boolean;
    label: string;
};

const CheckToggleInner = ({ checked, onChange, disabled, label }: CheckToggleInnerProps) => {
    const handleToggle = () => {
        if (disabled) return;
        onChange?.(!checked);
    };
    return (
        <button
            type="button"
            role="switch"
            aria-checked={!!checked}
            aria-label={label}
            disabled={disabled}
            onClick={handleToggle}
            className={styles.checkToggleButton}
        >
            {checked ? (
                <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect y="8" width="52" height="32" rx="16" fill="#1B1B1C" fillOpacity="0.9" />
                    <rect x="24" y="12" width="24" height="24" rx="12" fill="#FCF9F9" />
                    <path
                        d="M34.3669 28.0001L30.5669 24.2001L31.5169 23.2501L34.3669 26.1001L40.4836 19.9834L41.4336 20.9334L34.3669 28.0001Z"
                        fill="#1B1B1C"
                    />
                </svg>
            ) : (
                <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="52" height="32" rx="16" fill="#E0E3E3" fillOpacity="0.1" />
                    <rect
                        x="9"
                        y="9"
                        width="50"
                        height="30"
                        rx="15"
                        stroke="#1B1B1C"
                        strokeOpacity="0.4"
                        strokeWidth="2"
                    />
                    <rect x="12" y="12" width="24" height="24" rx="12" fill="#1B1B1C" fillOpacity="0.5" />
                    <path
                        d="M20.2668 28.6668L19.3335 27.7335L23.0668 24.0002L19.3335 20.2668L20.2668 19.3335L24.0002 23.0668L27.7335 19.3335L28.6668 20.2668L24.9335 24.0002L28.6668 27.7335L27.7335 28.6668L24.0002 24.9335L20.2668 28.6668Z"
                        fill="#E4E2E2"
                    />
                </svg>
            )}
        </button>
    );
};

type CheckToggleProps = {
    name: string | string[];
    label: string;
    disabled?: boolean;
};

const CheckToggle = ({ name, label, disabled }: CheckToggleProps) => (
    <Form.Item name={name} valuePropName="checked" noStyle>
        <CheckToggleInner label={label} disabled={disabled} />
    </Form.Item>
);

interface PermissionsSettingsArgs {
    tenantId: string;
    // Kept for API compatibility with callers; new 4-card layout renders all toggles unconditionally.
    // eslint-disable-next-line react/no-unused-prop-types
    visibleToggles?: PermissionToggleVisibility;
    forcedOffToggles?: PermissionToggleVisibility;
    superAdminControlMode?: boolean;
    /** Hide chat-type cards by key (e.g. liveChat on super-admin settings — managed under Global Configs). */
    excludeCardKeys?: Array<'oneOnOne' | 'liveChat' | 'group' | 'groupInternal'>;
    // eslint-disable-next-line react/no-unused-prop-types
    showSubToggles?: boolean;
}

type PermissionToggleVisibility = {
    anonymousChat?: boolean;
    calls?: boolean;
    supervision?: boolean;
    supervisionAnonymousChats?: boolean;
    supervisionOneOnOneChats?: boolean;
    audioCalls?: boolean;
    audioCallsAnonymousChats?: boolean;
    audioCallsOneOnOneChats?: boolean;
    audioCallsGroupChats?: boolean;
    audioCallsSupervisionChats?: boolean;
    videoCalls?: boolean;
    videoCallsAnonymousChats?: boolean;
    videoCallsOneOnOneChats?: boolean;
    videoCallsGroupChats?: boolean;
    videoCallsSupervisionChats?: boolean;
    threads?: boolean;
    threadsAnonymousChats?: boolean;
    threadsOneOnOneChats?: boolean;
    threadsGroupChats?: boolean;
    threadsSupervisionChats?: boolean;
    voiceMessages?: boolean;
    voiceMessagesAnonymousChats?: boolean;
    voiceMessagesOneOnOneChats?: boolean;
    voiceMessagesGroupChats?: boolean;
    voiceMessagesSupervisionChats?: boolean;
};

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
    calls: ['featureCallsEnabled'],
    supervision: [
        'featureSupervisionEnabled',
        'featureSupervisionAnonymousChatsEnabled',
        'featureSupervisionOneOnOneChatsEnabled',
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
            PLATFORM_TOGGLE_FIELDS[toggleKey as keyof PermissionToggleVisibility]?.forEach((field) => {
                fields.add(field);
            });
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

const enforceToggleRestrictions = (formData, forcedOffToggles?: PermissionsSettingsArgs['forcedOffToggles']) => {
    if (!forcedOffToggles) {
        return formData;
    }
    const next = { ...formData, settings: { ...(formData?.settings ?? {}) } };
    const setFalse = (keys: string[]) => {
        keys.forEach((key) => {
            next.settings[key] = false;
        });
    };
    if (forcedOffToggles.anonymousChat) setFalse(['featureAnonymousChatEnabled']);
    if (forcedOffToggles.calls) setFalse(['featureCallsEnabled']);
    if (forcedOffToggles.supervision) {
        setFalse([
            'featureSupervisionEnabled',
            'featureSupervisionAnonymousChatsEnabled',
            'featureSupervisionOneOnOneChatsEnabled',
        ]);
    }
    return next;
};

const syncMasterTogglesToTenantAdminControls = (formData) => {
    const next = { ...formData, settings: { ...(formData?.settings ?? {}) } };
    const { settings } = next;
    const isEnabled = (key: string) => settings?.[key] !== false;
    const anonymousEnabled = isEnabled('featureAnonymousChatEnabled');

    settings.tenantAdminControls = {
        ...(settings.tenantAdminControls ?? {}),
        allowedPermissionToggles: {
            anonymousChat: anonymousEnabled,
            calls: isEnabled('featureCallsEnabled'),
            supervision: isEnabled('featureSupervisionEnabled'),
            supervisionAnonymousChats: anonymousEnabled && isEnabled('featureSupervisionAnonymousChatsEnabled'),
            supervisionOneOnOneChats: isEnabled('featureSupervisionOneOnOneChatsEnabled'),
            audioCalls: isEnabled('featureAudioCallsEnabled'),
            audioCallsAnonymousChats: anonymousEnabled && isEnabled('featureAudioCallsAnonymousChatsEnabled'),
            audioCallsOneOnOneChats: isEnabled('featureAudioCallsOneOnOneChatsEnabled'),
            audioCallsGroupChats: isEnabled('featureAudioCallsGroupChatsEnabled'),
            audioCallsSupervisionChats: isEnabled('featureAudioCallsSupervisionChatsEnabled'),
            videoCalls: isEnabled('featureVideoCallsEnabled'),
            videoCallsAnonymousChats: anonymousEnabled && isEnabled('featureVideoCallsAnonymousChatsEnabled'),
            videoCallsOneOnOneChats: isEnabled('featureVideoCallsOneOnOneChatsEnabled'),
            videoCallsGroupChats: isEnabled('featureVideoCallsGroupChatsEnabled'),
            videoCallsSupervisionChats: isEnabled('featureVideoCallsSupervisionChatsEnabled'),
            threads: isEnabled('featureThreadsEnabled'),
            threadsAnonymousChats: anonymousEnabled && isEnabled('featureThreadsAnonymousChatsEnabled'),
            threadsOneOnOneChats: isEnabled('featureThreadsOneOnOneEnabled'),
            threadsGroupChats: isEnabled('featureThreadsGroupChatsEnabled'),
            threadsSupervisionChats: isEnabled('featureThreadsSupervisionChatsEnabled'),
            voiceMessages: isEnabled('featureVoiceMessagesEnabled'),
            voiceMessagesAnonymousChats: anonymousEnabled && isEnabled('featureVoiceMessagesAnonymousChatsEnabled'),
            voiceMessagesOneOnOneChats: isEnabled('featureVoiceMessagesOneOnOneChatsEnabled'),
            voiceMessagesGroupChats: isEnabled('featureVoiceMessagesGroupChatsEnabled'),
            voiceMessagesSupervisionChats: isEnabled('featureVoiceMessagesSupervisionChatsEnabled'),
        },
    };
    return next;
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

export const PermissionsSettings = ({
    tenantId,
    visibleToggles,
    forcedOffToggles,
    superAdminControlMode,
    excludeCardKeys,
}: PermissionsSettingsArgs) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const inheritedForcedOffFields = useMemo(() => getForcedOffFields(visibleToggles), [visibleToggles]);

    const initialValues = useMemo(
        () => ({
            ...data,
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...applyForcedOffFields(data?.settings ?? {}, inheritedForcedOffFields),
            },
        }),
        [data, inheritedForcedOffFields],
    );

    const gridRef = useRef<HTMLDivElement | null>(null);
    const scrollByCard = useCallback((dir: 'left' | 'right') => {
        const el = gridRef.current;
        if (!el) return;
        const firstCard = el.querySelector(`.${styles.chatTypeCard}`) as HTMLElement | null;
        const step = firstCard ? firstCard.offsetWidth + 16 : el.clientWidth * 0.9;
        el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
    }, []);

    const cardsToRender = excludeCardKeys?.length
        ? CHAT_TYPE_CARDS.filter((card) => !excludeCardKeys.includes(card.key))
        : CHAT_TYPE_CARDS;
    const formStateKey = useMemo(
        () => Array.from(inheritedForcedOffFields).sort().join('|'),
        [inheritedForcedOffFields],
    );

    return (
        <CardEditable
            key={`permissions-${tenantId}-${formStateKey}`}
            className={styles.transparentCardWrapper}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={(formData) => {
                const restrictedData = superAdminControlMode
                    ? syncMasterTogglesToTenantAdminControls(formData)
                    : enforceToggleRestrictions(formData, forcedOffToggles);

                mutate({
                    ...restrictedData,
                    settings: applyForcedOffFields(restrictedData?.settings, inheritedForcedOffFields),
                });
            }}
        >
            <div className={styles.cardGridOuter}>
                <button
                    type="button"
                    className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
                    onClick={() => scrollByCard('left')}
                    aria-label="Previous card"
                >
                    ‹
                </button>
                <button
                    type="button"
                    className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
                    onClick={() => scrollByCard('right')}
                    aria-label="Next card"
                >
                    ›
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
                                                    disabled={inheritedForcedOffFields.has(card.masterField[1])}
                                                />
                                            ) : (
                                                <span className={styles.masterRowPlaceholder} aria-hidden>
                                                    —
                                                </span>
                                            )}
                                        </div>

                                        <p className={styles.cardDescription}>{t(card.descriptionKey)}</p>

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
                                                            isSubToggleDisabled(card, toggle.field, masterEnabled) ||
                                                            inheritedForcedOffFields.has(toggle.field[1])
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }}
                        </Form.Item>
                    ))}
                </div>
            </div>
        </CardEditable>
    );
};
