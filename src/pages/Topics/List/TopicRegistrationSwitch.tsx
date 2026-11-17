import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InterestsOutlined } from '@mui/icons-material';
import { CardGrid } from '../../../components/CardGrid';
import { Card } from '../../../components/Card';
import { snackbar } from '../../../components/Snackbar';
import { M3Switch } from '../../../components/M3Switch';
import { Modal } from '../../../components/Modal';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { UserRole } from '../../../enums/UserRole';
import { useTenantAdminDataMutation } from '../../../hooks/useTenantAdminDataMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import styles from './TopicList.module.scss';

/**
 * The switch that turns the topic step of the registration on or off, with its confirmation.
 * Shared by the topic list and Settings → Themen, so whoever manages topics can reach it.
 */
export const TopicRegistrationSwitch = () => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { data: tenant } = useTenantData();
    const { settings } = useAppConfigContext();
    const { isEnabled, toggleFeature } = useFeatureContext();
    const { hasRole } = useUserRoles();
    const { mutate: updateTenantData, isPending: isTopicsSwitchPending } = useTenantAdminDataMutation({
        id: tenant?.id != null ? `${tenant.id}` : '',
    });
    const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
    const isTopicsFeatureActive = isEnabled(FeatureFlag.TopicsInRegistration);

    const confirmTopicsSwitch = useCallback(() => {
        updateTenantData(
            { settings: { topicsInRegistrationEnabled: !isTopicsFeatureActive } },
            {
                // Keep the confirmation open until the request actually succeeds: a failed PUT
                // must not vanish and leave the user thinking the switch went through.
                onSuccess: () => {
                    toggleFeature(FeatureFlag.TopicsInRegistration);
                    setSwitchConfirmOpen(false);
                },
                onError: async (error) => {
                    const content = await extractApiErrorMessage(error);
                    snackbar.error({ content });
                },
            },
        );
    }, [isTopicsFeatureActive, toggleFeature, updateTenantData]);

    // With multitenancy on a single domain only the tenant admin may decide this for the tenant.
    const canShowTopicSwitch =
        ((settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
            !settings.multitenancyWithSingleDomainEnabled) &&
        can(PermissionAction.Create, Resource.Topic) &&
        isEnabled(FeatureFlag.Topics);

    if (!canShowTopicSwitch) return null;

    return (
        <>
            <CardGrid.Item span={3}>
                <Card
                    variant="dialog"
                    autoHeight
                    headerIcon={<InterestsOutlined />}
                    titleKey="topicCatalogue.registrationTitle"
                >
                    <div className={styles.switchRow}>
                        <M3Switch
                            id="topics-in-registration"
                            checked={isTopicsFeatureActive}
                            disabled={isTopicsSwitchPending || tenant?.id == null}
                            label={t('topics.featureToggle')}
                            onChange={() => setSwitchConfirmOpen(true)}
                        />
                        <label htmlFor="topics-in-registration">{t('topics.featureToggle')}</label>
                    </div>
                </Card>
            </CardGrid.Item>
            {switchConfirmOpen && (
                <Modal
                    titleKey={
                        isTopicsFeatureActive ? 'topics.featureToggle.off.title' : 'topics.featureToggle.on.title'
                    }
                    contentKey={
                        isTopicsFeatureActive
                            ? 'topics.featureToggle.off.description'
                            : 'topics.featureToggle.on.description'
                    }
                    icon={<InterestsOutlined />}
                    width={768}
                    cancelLabelKey="btn.cancel.uppercase"
                    okLabelKey="btn.ok.uppercase"
                    confirmDisabled={isTopicsSwitchPending || tenant?.id == null}
                    onConfirm={confirmTopicsSwitch}
                    onClose={() => setSwitchConfirmOpen(false)}
                />
            )}
        </>
    );
};
