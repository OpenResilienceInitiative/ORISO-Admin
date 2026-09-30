import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { runtimeConfig } from '../../../../config/runtimeConfig';

/**
 * ORISO-Admin#988 / Frank 2026-09-16: supervision is a feature inside conversation types, not a
 * conversation type of its own. It used to be wired as the master of the "groupInternal" chat-type
 * card in PermissionsSettings (chatTypeCards.ts), which was wrong — that card is "internal group
 * chats", a real conversation type. The supervision master (featureSupervisionEnabled) and its
 * seven feature toggles move here, next to the "Allow group chat" switch that stays the master
 * over both group cards (conversation circles + internal group chats).
 */
const SUPERVISION_FEATURE_TOGGLES: Array<{ labelKey: string; field: string }> = [
    { labelKey: 'tenants.permissions.feature.videoCalls', field: 'featureVideoCallsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.audioCalls', field: 'featureAudioCallsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.voiceMessages', field: 'featureVoiceMessagesSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.threads', field: 'featureThreadsSupervisionChatsEnabled' },
    { labelKey: 'tenants.permissions.feature.mediaUpload', field: 'featureMediaUploadSupervisionChatsEnabled' },
    {
        labelKey: 'tenants.permissions.feature.mediaInlineDisplay',
        field: 'featureMediaInlineDisplaySupervisionChatsEnabled',
    },
    { labelKey: 'tenants.permissions.feature.mediaAiScan', field: 'featureMediaAiScanSupervisionChatsEnabled' },
];

interface OtherFunctionsSettingsArgs {
    tenantId: string;
    hideTopics?: boolean;
    hideStatistics?: boolean;
    hideGroupChatToggle?: boolean;
}

export const OtherFunctionsSettings = ({
    tenantId,
    hideTopics,
    hideStatistics,
    hideGroupChatToggle,
}: OtherFunctionsSettingsArgs) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const extraI18nTopicKey = settings.multitenancyWithSingleDomainEnabled ? '.mtsd' : '';
    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.appSettings.otherFunctions.title"
            onSave={mutate}
        >
            {!hideTopics && (
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey={`tenants.appSettings.otherFunctions${extraI18nTopicKey}.allowTopicCreation.title`}
                        name={['settings', 'featureTopicsEnabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>
                        {t(`tenants.appSettings.otherFunctions${extraI18nTopicKey}.allowTopicCreation.description`)}
                    </p>
                </div>
            )}
            {!hideStatistics && (
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.otherFunctions.statistics.title"
                        name={['settings', 'featureStatisticsEnabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.otherFunctions.statistics.description')}</p>
                </div>
            )}
            {!hideGroupChatToggle && (
                <div className={styles.checkGroup}>
                    <FormSwitchField
                        labelKey="tenants.appSettings.otherFunctions.groupChat.title"
                        name={['settings', 'featureGroupChatV2Enabled']}
                        inline
                        disableLabels
                    />
                    <p className={styles.checkInfo}>{t('tenants.appSettings.otherFunctions.groupChat.description')}</p>
                </div>
            )}
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.appSettings.otherFunctions.supervision.title"
                    name={['settings', 'featureSupervisionEnabled']}
                    inline
                    disableLabels
                />
                <p className={styles.checkInfo}>{t('tenants.appSettings.otherFunctions.supervision.description')}</p>
            </div>
            <>
                {SUPERVISION_FEATURE_TOGGLES.map(({ labelKey, field }) => {
                    const capabilityUnavailable =
                        field === 'featureMediaAiScanSupervisionChatsEnabled' && !runtimeConfig.mediaAiScanAvailable;
                    return (
                        <div key={field} className={classNames(styles.checkGroup, styles.supervisionChild)}>
                            <FormSwitchField
                                labelKey={labelKey}
                                name={['settings', field]}
                                inline
                                disableLabels
                                disabled={capabilityUnavailable}
                            />
                            {capabilityUnavailable && (
                                <p className={styles.checkInfo}>
                                    {t('tenants.permissions.feature.mediaAiScanUnavailable')}
                                </p>
                            )}
                        </div>
                    );
                })}
            </>
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.appSettings.otherFunctions.teamDiscussion.title"
                    name={['settings', 'featureTeamDiscussionEnabled']}
                    inline
                    disableLabels
                />
                <p className={styles.checkInfo}>{t('tenants.appSettings.otherFunctions.teamDiscussion.description')}</p>
            </div>
        </CardEditable>
    );
};
