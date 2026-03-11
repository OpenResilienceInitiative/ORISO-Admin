import { Card, Form } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

interface PermissionsSettingsArgs {
    tenantId: string;
    visibleToggles?: PermissionToggleVisibility;
    forcedOffToggles?: PermissionToggleVisibility;
    superAdminControlMode?: boolean;
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

    if (forcedOffToggles.anonymousChat) {
        setFalse(['featureAnonymousChatEnabled']);
    }
    if (forcedOffToggles.calls) {
        setFalse(['featureCallsEnabled']);
    }
    if (forcedOffToggles.supervision) {
        setFalse([
            'featureSupervisionEnabled',
            'featureSupervisionAnonymousChatsEnabled',
            'featureSupervisionOneOnOneChatsEnabled',
            'featureAudioCallsSupervisionChatsEnabled',
            'featureVideoCallsSupervisionChatsEnabled',
            'featureThreadsSupervisionChatsEnabled',
            'featureVoiceMessagesSupervisionChatsEnabled',
        ]);
    }
    if (forcedOffToggles.audioCalls) {
        setFalse([
            'featureAudioCallsEnabled',
            'featureAudioCallsAnonymousChatsEnabled',
            'featureAudioCallsOneOnOneChatsEnabled',
            'featureAudioCallsGroupChatsEnabled',
            'featureAudioCallsSupervisionChatsEnabled',
        ]);
    }
    if (forcedOffToggles.videoCalls) {
        setFalse([
            'featureVideoCallsEnabled',
            'featureVideoCallsAnonymousChatsEnabled',
            'featureVideoCallsOneOnOneChatsEnabled',
            'featureVideoCallsGroupChatsEnabled',
            'featureVideoCallsSupervisionChatsEnabled',
        ]);
    }
    if (forcedOffToggles.threads) {
        setFalse([
            'featureThreadsEnabled',
            'featureThreadsAnonymousChatsEnabled',
            'featureThreadsGroupChatsEnabled',
            'featureThreadsOneOnOneEnabled',
            'featureThreadsSupervisionChatsEnabled',
        ]);
    }
    if (forcedOffToggles.voiceMessages) {
        setFalse([
            'featureVoiceMessagesEnabled',
            'featureVoiceMessagesAnonymousChatsEnabled',
            'featureVoiceMessagesOneOnOneChatsEnabled',
            'featureVoiceMessagesGroupChatsEnabled',
            'featureVoiceMessagesSupervisionChatsEnabled',
        ]);
    }
    if (forcedOffToggles.supervisionAnonymousChats) {
        setFalse(['featureSupervisionAnonymousChatsEnabled']);
    }
    if (forcedOffToggles.supervisionOneOnOneChats) {
        setFalse(['featureSupervisionOneOnOneChatsEnabled']);
    }
    if (forcedOffToggles.audioCallsAnonymousChats) {
        setFalse(['featureAudioCallsAnonymousChatsEnabled']);
    }
    if (forcedOffToggles.audioCallsOneOnOneChats) {
        setFalse(['featureAudioCallsOneOnOneChatsEnabled']);
    }
    if (forcedOffToggles.audioCallsGroupChats) {
        setFalse(['featureAudioCallsGroupChatsEnabled']);
    }
    if (forcedOffToggles.audioCallsSupervisionChats) {
        setFalse(['featureAudioCallsSupervisionChatsEnabled']);
    }
    if (forcedOffToggles.videoCallsAnonymousChats) {
        setFalse(['featureVideoCallsAnonymousChatsEnabled']);
    }
    if (forcedOffToggles.videoCallsOneOnOneChats) {
        setFalse(['featureVideoCallsOneOnOneChatsEnabled']);
    }
    if (forcedOffToggles.videoCallsGroupChats) {
        setFalse(['featureVideoCallsGroupChatsEnabled']);
    }
    if (forcedOffToggles.videoCallsSupervisionChats) {
        setFalse(['featureVideoCallsSupervisionChatsEnabled']);
    }
    if (forcedOffToggles.threadsAnonymousChats) {
        setFalse(['featureThreadsAnonymousChatsEnabled']);
    }
    if (forcedOffToggles.threadsOneOnOneChats) {
        setFalse(['featureThreadsOneOnOneEnabled']);
    }
    if (forcedOffToggles.threadsGroupChats) {
        setFalse(['featureThreadsGroupChatsEnabled']);
    }
    if (forcedOffToggles.threadsSupervisionChats) {
        setFalse(['featureThreadsSupervisionChatsEnabled']);
    }
    if (forcedOffToggles.voiceMessagesAnonymousChats) {
        setFalse(['featureVoiceMessagesAnonymousChatsEnabled']);
    }
    if (forcedOffToggles.voiceMessagesOneOnOneChats) {
        setFalse(['featureVoiceMessagesOneOnOneChatsEnabled']);
    }
    if (forcedOffToggles.voiceMessagesGroupChats) {
        setFalse(['featureVoiceMessagesGroupChatsEnabled']);
    }
    if (forcedOffToggles.voiceMessagesSupervisionChats) {
        setFalse(['featureVoiceMessagesSupervisionChatsEnabled']);
    }

    return next;
};

const syncMasterTogglesToTenantAdminControls = (formData) => {
    const next = { ...formData, settings: { ...(formData?.settings ?? {}) } };
    const { settings } = next;
    const isEnabled = (key: string) => settings?.[key] !== false;
    const callsEnabled = isEnabled('featureCallsEnabled');
    const supervisionEnabled = isEnabled('featureSupervisionEnabled');
    const audioEnabled = isEnabled('featureAudioCallsEnabled');
    const videoEnabled = isEnabled('featureVideoCallsEnabled');
    const threadsEnabled = isEnabled('featureThreadsEnabled');
    const voiceEnabled = isEnabled('featureVoiceMessagesEnabled');
    const anonymousEnabled = isEnabled('featureAnonymousChatEnabled');
    const supervisionAnonymousEnabled =
        supervisionEnabled && settings.featureSupervisionAnonymousChatsEnabled !== false;
    const supervisionOneOnOneEnabled = supervisionEnabled && settings.featureSupervisionOneOnOneChatsEnabled !== false;
    const audioAnonymousEnabled = audioEnabled && isEnabled('featureAudioCallsAnonymousChatsEnabled');
    const audioOneOnOneEnabled = audioEnabled && isEnabled('featureAudioCallsOneOnOneChatsEnabled');
    const audioGroupEnabled = audioEnabled && isEnabled('featureAudioCallsGroupChatsEnabled');
    const audioSupervisionEnabled =
        audioEnabled && supervisionEnabled && isEnabled('featureAudioCallsSupervisionChatsEnabled');
    const videoAnonymousEnabled = videoEnabled && isEnabled('featureVideoCallsAnonymousChatsEnabled');
    const videoOneOnOneEnabled = videoEnabled && isEnabled('featureVideoCallsOneOnOneChatsEnabled');
    const videoGroupEnabled = videoEnabled && isEnabled('featureVideoCallsGroupChatsEnabled');
    const videoSupervisionEnabled =
        videoEnabled && supervisionEnabled && isEnabled('featureVideoCallsSupervisionChatsEnabled');
    const threadsAnonymousEnabled = threadsEnabled && isEnabled('featureThreadsAnonymousChatsEnabled');
    const threadsOneOnOneEnabled = threadsEnabled && isEnabled('featureThreadsOneOnOneEnabled');
    const threadsGroupEnabled = threadsEnabled && isEnabled('featureThreadsGroupChatsEnabled');
    const threadsSupervisionEnabled =
        threadsEnabled && supervisionEnabled && isEnabled('featureThreadsSupervisionChatsEnabled');
    const voiceAnonymousEnabled = voiceEnabled && isEnabled('featureVoiceMessagesAnonymousChatsEnabled');
    const voiceOneOnOneEnabled = voiceEnabled && isEnabled('featureVoiceMessagesOneOnOneChatsEnabled');
    const voiceGroupEnabled = voiceEnabled && isEnabled('featureVoiceMessagesGroupChatsEnabled');
    const voiceSupervisionEnabled =
        voiceEnabled && supervisionEnabled && isEnabled('featureVoiceMessagesSupervisionChatsEnabled');

    settings.featureAnonymousChatEnabled = anonymousEnabled;
    settings.featureCallsEnabled = callsEnabled;
    settings.featureSupervisionEnabled = supervisionEnabled;
    settings.featureSupervisionAnonymousChatsEnabled = supervisionAnonymousEnabled;
    settings.featureSupervisionOneOnOneChatsEnabled = supervisionOneOnOneEnabled;
    settings.featureAudioCallsEnabled = audioEnabled;
    settings.featureAudioCallsAnonymousChatsEnabled = audioAnonymousEnabled;
    settings.featureAudioCallsOneOnOneChatsEnabled = audioOneOnOneEnabled;
    settings.featureAudioCallsGroupChatsEnabled = audioGroupEnabled;
    settings.featureAudioCallsSupervisionChatsEnabled = audioSupervisionEnabled;
    settings.featureVideoCallsEnabled = videoEnabled;
    settings.featureVideoCallsAnonymousChatsEnabled = videoAnonymousEnabled;
    settings.featureVideoCallsOneOnOneChatsEnabled = videoOneOnOneEnabled;
    settings.featureVideoCallsGroupChatsEnabled = videoGroupEnabled;
    settings.featureVideoCallsSupervisionChatsEnabled = videoSupervisionEnabled;
    settings.featureThreadsEnabled = threadsEnabled;
    settings.featureThreadsAnonymousChatsEnabled = threadsAnonymousEnabled;
    settings.featureThreadsGroupChatsEnabled = threadsGroupEnabled;
    settings.featureThreadsOneOnOneEnabled = threadsOneOnOneEnabled;
    settings.featureThreadsSupervisionChatsEnabled = threadsSupervisionEnabled;
    settings.featureVoiceMessagesEnabled = voiceEnabled;
    settings.featureVoiceMessagesAnonymousChatsEnabled = voiceAnonymousEnabled;
    settings.featureVoiceMessagesOneOnOneChatsEnabled = voiceOneOnOneEnabled;
    settings.featureVoiceMessagesGroupChatsEnabled = voiceGroupEnabled;
    settings.featureVoiceMessagesSupervisionChatsEnabled = voiceSupervisionEnabled;

    settings.tenantAdminControls = {
        ...(settings.tenantAdminControls ?? {}),
        allowedPermissionToggles: {
            anonymousChat: anonymousEnabled,
            calls: callsEnabled,
            supervision: supervisionEnabled,
            supervisionAnonymousChats: supervisionAnonymousEnabled,
            supervisionOneOnOneChats: supervisionOneOnOneEnabled,
            audioCalls: audioEnabled,
            audioCallsAnonymousChats: audioAnonymousEnabled,
            audioCallsOneOnOneChats: audioOneOnOneEnabled,
            audioCallsGroupChats: audioGroupEnabled,
            audioCallsSupervisionChats: audioSupervisionEnabled,
            videoCalls: videoEnabled,
            videoCallsAnonymousChats: videoAnonymousEnabled,
            videoCallsOneOnOneChats: videoOneOnOneEnabled,
            videoCallsGroupChats: videoGroupEnabled,
            videoCallsSupervisionChats: videoSupervisionEnabled,
            threads: threadsEnabled,
            threadsAnonymousChats: threadsAnonymousEnabled,
            threadsOneOnOneChats: threadsOneOnOneEnabled,
            threadsGroupChats: threadsGroupEnabled,
            threadsSupervisionChats: threadsSupervisionEnabled,
            voiceMessages: voiceEnabled,
            voiceMessagesAnonymousChats: voiceAnonymousEnabled,
            voiceMessagesOneOnOneChats: voiceOneOnOneEnabled,
            voiceMessagesGroupChats: voiceGroupEnabled,
            voiceMessagesSupervisionChats: voiceSupervisionEnabled,
        },
    };

    return next;
};

export const PermissionsSettings = ({
    tenantId,
    visibleToggles,
    forcedOffToggles,
    superAdminControlMode,
    showSubToggles = true,
}: PermissionsSettingsArgs) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    const initialValues = useMemo(
        () => ({
            ...data,
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...(data?.settings ?? {}),
            },
        }),
        [data],
    );
    const visibility = {
        anonymousChat: true,
        calls: true,
        supervision: true,
        supervisionAnonymousChats: true,
        supervisionOneOnOneChats: true,
        audioCalls: true,
        audioCallsAnonymousChats: true,
        audioCallsOneOnOneChats: true,
        audioCallsGroupChats: true,
        audioCallsSupervisionChats: true,
        videoCalls: true,
        videoCallsAnonymousChats: true,
        videoCallsOneOnOneChats: true,
        videoCallsGroupChats: true,
        videoCallsSupervisionChats: true,
        threads: true,
        threadsAnonymousChats: true,
        threadsOneOnOneChats: true,
        threadsGroupChats: true,
        threadsSupervisionChats: true,
        voiceMessages: true,
        voiceMessagesAnonymousChats: true,
        voiceMessagesOneOnOneChats: true,
        voiceMessagesGroupChats: true,
        voiceMessagesSupervisionChats: true,
        ...(visibleToggles ?? {}),
    };

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={(formData) =>
                mutate(
                    superAdminControlMode
                        ? syncMasterTogglesToTenantAdminControls(formData)
                        : enforceToggleRestrictions(formData, forcedOffToggles),
                )
            }
        >
            <div className={styles.sectionGrid}>
                {visibility.anonymousChat && (
                    <Card className={styles.sectionCard} size="small" bordered>
                        <div className={styles.checkGroup}>
                            <FormSwitchField
                                labelKey="tenants.permissions.anonymousChat.title"
                                name={['settings', 'featureAnonymousChatEnabled']}
                                inline
                                disableLabels
                            />
                            <p className={styles.checkInfo}>{t('tenants.permissions.anonymousChat.description')}</p>
                        </div>
                    </Card>
                )}

                {visibility.calls && (
                    <Card className={styles.sectionCard} size="small" bordered>
                        <div className={styles.checkGroup}>
                            <FormSwitchField
                                labelKey="tenants.permissions.calls.title"
                                name={['settings', 'featureCallsEnabled']}
                                inline
                                disableLabels
                            />
                            <p className={styles.checkInfo}>{t('tenants.permissions.calls.description')}</p>
                        </div>
                    </Card>
                )}

                {visibility.supervision && (
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) =>
                            prev?.settings?.featureThreadsEnabled !== curr?.settings?.featureThreadsEnabled ||
                            prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                        }
                    >
                        {({ getFieldValue }) => {
                            const supervisionEnabled =
                                getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                            return (
                                <Card className={styles.sectionCard} size="small" bordered>
                                    <div className={styles.checkGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.supervision.title"
                                            name={['settings', 'featureSupervisionEnabled']}
                                            inline
                                            disableLabels
                                        />
                                        <p className={styles.checkInfo}>
                                            {t('tenants.permissions.supervision.description')}
                                        </p>
                                    </div>

                                    {showSubToggles && (
                                        <div className={styles.subCheckGrid}>
                                            {visibility.supervisionAnonymousChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.anonymous"
                                                        name={['settings', 'featureSupervisionAnonymousChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!supervisionEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.supervisionOneOnOneChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.oneOnOne"
                                                        name={['settings', 'featureSupervisionOneOnOneChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!supervisionEnabled}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        }}
                    </Form.Item>
                )}

                {visibility.audioCalls && (
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) =>
                            prev?.settings?.featureAudioCallsEnabled !== curr?.settings?.featureAudioCallsEnabled ||
                            prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                        }
                    >
                        {({ getFieldValue }) => {
                            const audioMasterEnabled =
                                getFieldValue(['settings', 'featureAudioCallsEnabled']) !== false;
                            const supervisionEnabled =
                                getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                            return (
                                <Card className={styles.sectionCard} size="small" bordered>
                                    <div className={styles.checkGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.audioCalls.title"
                                            name={['settings', 'featureAudioCallsEnabled']}
                                            inline
                                            disableLabels
                                        />
                                        <p className={styles.checkInfo}>
                                            {t('tenants.permissions.audioCalls.description')}
                                        </p>
                                    </div>

                                    {showSubToggles && (
                                        <div className={styles.subCheckGrid}>
                                            {visibility.audioCallsAnonymousChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.anonymous"
                                                        name={['settings', 'featureAudioCallsAnonymousChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!audioMasterEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.audioCallsOneOnOneChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.oneOnOne"
                                                        name={['settings', 'featureAudioCallsOneOnOneChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!audioMasterEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.audioCallsGroupChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.group"
                                                        name={['settings', 'featureAudioCallsGroupChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!audioMasterEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.audioCallsSupervisionChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.supervision"
                                                        name={['settings', 'featureAudioCallsSupervisionChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!audioMasterEnabled || !supervisionEnabled}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        }}
                    </Form.Item>
                )}

                {visibility.videoCalls && (
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) =>
                            prev?.settings?.featureVideoCallsEnabled !== curr?.settings?.featureVideoCallsEnabled ||
                            prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                        }
                    >
                        {({ getFieldValue }) => {
                            const videoMasterEnabled =
                                getFieldValue(['settings', 'featureVideoCallsEnabled']) !== false;
                            const supervisionEnabled =
                                getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                            return (
                                <Card className={styles.sectionCard} size="small" bordered>
                                    <div className={styles.checkGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.videoCalls.title"
                                            name={['settings', 'featureVideoCallsEnabled']}
                                            inline
                                            disableLabels
                                        />
                                        <p className={styles.checkInfo}>
                                            {t('tenants.permissions.videoCalls.description')}
                                        </p>
                                    </div>

                                    {showSubToggles && (
                                        <div className={styles.subCheckGrid}>
                                            {visibility.videoCallsAnonymousChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.anonymous"
                                                        name={['settings', 'featureVideoCallsAnonymousChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!videoMasterEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.videoCallsOneOnOneChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.oneOnOne"
                                                        name={['settings', 'featureVideoCallsOneOnOneChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!videoMasterEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.videoCallsGroupChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.group"
                                                        name={['settings', 'featureVideoCallsGroupChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!videoMasterEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.videoCallsSupervisionChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.supervision"
                                                        name={['settings', 'featureVideoCallsSupervisionChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!videoMasterEnabled || !supervisionEnabled}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        }}
                    </Form.Item>
                )}

                {visibility.threads && (
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) =>
                            prev?.settings?.featureVoiceMessagesEnabled !==
                                curr?.settings?.featureVoiceMessagesEnabled ||
                            prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                        }
                    >
                        {({ getFieldValue }) => {
                            const threadsEnabled = getFieldValue(['settings', 'featureThreadsEnabled']) !== false;
                            const supervisionEnabled =
                                getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                            return (
                                <Card className={styles.sectionCard} size="small" bordered>
                                    <div className={styles.checkGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.threads.title"
                                            name={['settings', 'featureThreadsEnabled']}
                                            inline
                                            disableLabels
                                        />
                                        <p className={styles.checkInfo}>
                                            {t('tenants.permissions.threads.description')}
                                        </p>
                                    </div>

                                    {showSubToggles && (
                                        <div className={styles.subCheckGrid}>
                                            {visibility.threadsAnonymousChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.anonymous"
                                                        name={['settings', 'featureThreadsAnonymousChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!threadsEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.threadsOneOnOneChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.oneOnOne"
                                                        name={['settings', 'featureThreadsOneOnOneEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!threadsEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.threadsGroupChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.group"
                                                        name={['settings', 'featureThreadsGroupChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!threadsEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.threadsSupervisionChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.supervision"
                                                        name={['settings', 'featureThreadsSupervisionChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!threadsEnabled || !supervisionEnabled}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        }}
                    </Form.Item>
                )}

                {visibility.voiceMessages && (
                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                            const voiceMessagesEnabled =
                                getFieldValue(['settings', 'featureVoiceMessagesEnabled']) !== false;
                            const supervisionEnabled =
                                getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                            return (
                                <Card className={styles.sectionCard} size="small" bordered>
                                    <div className={styles.checkGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.voiceMessages.title"
                                            name={['settings', 'featureVoiceMessagesEnabled']}
                                            inline
                                            disableLabels
                                        />
                                        <p className={styles.checkInfo}>
                                            {t('tenants.permissions.voiceMessages.description')}
                                        </p>
                                    </div>

                                    {showSubToggles && (
                                        <div className={styles.subCheckGrid}>
                                            {visibility.voiceMessagesAnonymousChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.anonymous"
                                                        name={['settings', 'featureVoiceMessagesAnonymousChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!voiceMessagesEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.voiceMessagesOneOnOneChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.oneOnOne"
                                                        name={['settings', 'featureVoiceMessagesOneOnOneChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!voiceMessagesEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.voiceMessagesGroupChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.group"
                                                        name={['settings', 'featureVoiceMessagesGroupChatsEnabled']}
                                                        inline
                                                        disableLabels
                                                        disabled={!voiceMessagesEnabled}
                                                    />
                                                </div>
                                            )}
                                            {visibility.voiceMessagesSupervisionChats && (
                                                <div className={styles.subCheckGroup}>
                                                    <FormSwitchField
                                                        labelKey="tenants.permissions.chatTypes.supervision"
                                                        name={[
                                                            'settings',
                                                            'featureVoiceMessagesSupervisionChatsEnabled',
                                                        ]}
                                                        inline
                                                        disableLabels
                                                        disabled={!voiceMessagesEnabled || !supervisionEnabled}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        }}
                    </Form.Item>
                )}
            </div>
        </CardEditable>
    );
};
