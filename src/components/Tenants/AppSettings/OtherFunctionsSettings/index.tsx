import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { TileSections } from '../../../TileSections';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { otherFunctionsHelp } from './help';
import styles from './styles.module.scss';

interface OtherFunctionsSettingsArgs {
    tenantId: string;
    hideStatistics?: boolean;
}

/**
 * The tile of the "Weitere" tab (route `functionalities` / `app-settings`). ORISO-Admin#1577 (Frank,
 * 2026-11-19): calls, group chats, Team-Chat and supervision moved to Funktionszugriff; what stays are
 * the Träger functions that belong to no conversation type, in the section design of the tiles there.
 * Both are plain Träger settings (no policy, no level above or below).
 */
export const OtherFunctionsSettings = ({ tenantId, hideStatistics }: OtherFunctionsSettingsArgs) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const topicKey = settings.multitenancyWithSingleDomainEnabled ? '.mtsd' : '';

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.appSettings.otherFunctions.title"
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            help={otherFunctionsHelp}
        >
            <TileSections>
                <TileSections.Section
                    wide
                    id="other-topics-statistics"
                    title={t('tileHelp.otherFunctions.general.title')}
                    note={t('tenants.appSettings.otherFunctions.topicsStatistics.note')}
                    collapsible
                >
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey={`tenants.appSettings.otherFunctions${topicKey}.allowTopicCreation.title`}
                            name={['settings', 'featureTopicsEnabled']}
                            inline
                            disableLabels
                        />
                        <p className={styles.checkInfo}>
                            {t(`tenants.appSettings.otherFunctions${topicKey}.allowTopicCreation.description`)}
                        </p>
                    </div>
                    {!hideStatistics && (
                        <div className={styles.checkGroup}>
                            <FormSwitchField
                                labelKey="tenants.appSettings.otherFunctions.statistics.title"
                                name={['settings', 'featureStatisticsEnabled']}
                                inline
                                disableLabels
                            />
                            <p className={styles.checkInfo}>
                                {t('tenants.appSettings.otherFunctions.statistics.description')}
                            </p>
                        </div>
                    )}
                </TileSections.Section>
            </TileSections>
        </CardEditable>
    );
};
