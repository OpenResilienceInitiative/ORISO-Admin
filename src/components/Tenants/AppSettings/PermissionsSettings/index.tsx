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
}

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

export const PermissionsSettings = ({ tenantId }: PermissionsSettingsArgs) => {
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
        [data]
    );

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="tenants.permissions.title"
            onSave={mutate}
        >
            <div className={styles.sectionGrid}>
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

                <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                        prev?.settings?.featureThreadsEnabled !== curr?.settings?.featureThreadsEnabled ||
                        prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                    }
                >
                    {({ getFieldValue }) => {
                        const supervisionEnabled = getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
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

                                <div className={styles.subCheckGrid}>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.anonymous"
                                            name={['settings', 'featureSupervisionAnonymousChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!supervisionEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.oneOnOne"
                                            name={['settings', 'featureSupervisionOneOnOneChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!supervisionEnabled}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    }}
                </Form.Item>

                <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                        prev?.settings?.featureCallsEnabled !== curr?.settings?.featureCallsEnabled ||
                        prev?.settings?.featureAudioCallsEnabled !== curr?.settings?.featureAudioCallsEnabled ||
                        prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                    }
                >
                    {({ getFieldValue }) => {
                        const callsMasterEnabled = getFieldValue(['settings', 'featureCallsEnabled']) !== false;
                        const audioMasterEnabled = getFieldValue(['settings', 'featureAudioCallsEnabled']) !== false;
                        const supervisionEnabled = getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                        return (
                            <Card className={styles.sectionCard} size="small" bordered>
                                <div className={styles.checkGroup}>
                                    <FormSwitchField
                                        labelKey="tenants.permissions.audioCalls.title"
                                        name={['settings', 'featureAudioCallsEnabled']}
                                        inline
                                        disableLabels
                                        disabled={!callsMasterEnabled}
                                    />
                                    <p className={styles.checkInfo}>
                                        {t('tenants.permissions.audioCalls.description')}
                                    </p>
                                </div>

                                <div className={styles.subCheckGrid}>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.anonymous"
                                            name={['settings', 'featureAudioCallsAnonymousChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!audioMasterEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.oneOnOne"
                                            name={['settings', 'featureAudioCallsOneOnOneChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!audioMasterEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.group"
                                            name={['settings', 'featureAudioCallsGroupChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!audioMasterEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.supervision"
                                            name={['settings', 'featureAudioCallsSupervisionChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!audioMasterEnabled || !supervisionEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    }}
                </Form.Item>

                <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                        prev?.settings?.featureCallsEnabled !== curr?.settings?.featureCallsEnabled ||
                        prev?.settings?.featureVideoCallsEnabled !== curr?.settings?.featureVideoCallsEnabled ||
                        prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                    }
                >
                    {({ getFieldValue }) => {
                        const callsMasterEnabled = getFieldValue(['settings', 'featureCallsEnabled']) !== false;
                        const videoMasterEnabled = getFieldValue(['settings', 'featureVideoCallsEnabled']) !== false;
                        const supervisionEnabled = getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                        return (
                            <Card className={styles.sectionCard} size="small" bordered>
                                <div className={styles.checkGroup}>
                                    <FormSwitchField
                                        labelKey="tenants.permissions.videoCalls.title"
                                        name={['settings', 'featureVideoCallsEnabled']}
                                        inline
                                        disableLabels
                                        disabled={!callsMasterEnabled}
                                    />
                                    <p className={styles.checkInfo}>
                                        {t('tenants.permissions.videoCalls.description')}
                                    </p>
                                </div>

                                <div className={styles.subCheckGrid}>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.anonymous"
                                            name={['settings', 'featureVideoCallsAnonymousChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!videoMasterEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.oneOnOne"
                                            name={['settings', 'featureVideoCallsOneOnOneChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!videoMasterEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.group"
                                            name={['settings', 'featureVideoCallsGroupChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!videoMasterEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.supervision"
                                            name={['settings', 'featureVideoCallsSupervisionChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!videoMasterEnabled || !supervisionEnabled || !callsMasterEnabled}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    }}
                </Form.Item>

                <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                        prev?.settings?.featureVoiceMessagesEnabled !== curr?.settings?.featureVoiceMessagesEnabled ||
                        prev?.settings?.featureSupervisionEnabled !== curr?.settings?.featureSupervisionEnabled
                    }
                >
                    {({ getFieldValue }) => {
                        const threadsEnabled = getFieldValue(['settings', 'featureThreadsEnabled']) !== false;
                        const supervisionEnabled = getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
                        return (
                            <Card className={styles.sectionCard} size="small" bordered>
                                <div className={styles.checkGroup}>
                                    <FormSwitchField
                                        labelKey="tenants.permissions.threads.title"
                                        name={['settings', 'featureThreadsEnabled']}
                                        inline
                                        disableLabels
                                    />
                                    <p className={styles.checkInfo}>{t('tenants.permissions.threads.description')}</p>
                                </div>

                                <div className={styles.subCheckGrid}>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.anonymous"
                                            name={['settings', 'featureThreadsAnonymousChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!threadsEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.oneOnOne"
                                            name={['settings', 'featureThreadsOneOnOneEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!threadsEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.group"
                                            name={['settings', 'featureThreadsGroupChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!threadsEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.supervision"
                                            name={['settings', 'featureThreadsSupervisionChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!threadsEnabled || !supervisionEnabled}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    }}
                </Form.Item>

                <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                        const voiceMessagesEnabled =
                            getFieldValue(['settings', 'featureVoiceMessagesEnabled']) !== false;
                        const supervisionEnabled = getFieldValue(['settings', 'featureSupervisionEnabled']) !== false;
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

                                <div className={styles.subCheckGrid}>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.anonymous"
                                            name={['settings', 'featureVoiceMessagesAnonymousChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!voiceMessagesEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.oneOnOne"
                                            name={['settings', 'featureVoiceMessagesOneOnOneChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!voiceMessagesEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.group"
                                            name={['settings', 'featureVoiceMessagesGroupChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!voiceMessagesEnabled}
                                        />
                                    </div>
                                    <div className={styles.subCheckGroup}>
                                        <FormSwitchField
                                            labelKey="tenants.permissions.chatTypes.supervision"
                                            name={['settings', 'featureVoiceMessagesSupervisionChatsEnabled']}
                                            inline
                                            disableLabels
                                            disabled={!voiceMessagesEnabled || !supervisionEnabled}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    }}
                </Form.Item>
            </div>
        </CardEditable>
    );
};
