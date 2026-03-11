import { Col, Row } from 'antd';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../components/CardEditable';
import { FormSwitchField } from '../../../../components/FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

const DEFAULT_CONTROLS = {
    permissionsPageEnabled: true,
    allowedPermissionToggles: {
        anonymousChat: true,
        calls: true,
        supervision: true,
        audioCalls: true,
        videoCalls: true,
        threads: true,
        voiceMessages: true,
    },
} as const;

export const TenantGlobalSettings = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id });
    const { mutate } = useTenantAdminDataMutation({
        id,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    const initialValues = useMemo(
        () => ({
            ...data,
            settings: {
                ...(data?.settings ?? {}),
                tenantAdminControls: {
                    ...DEFAULT_CONTROLS,
                    ...(data?.settings?.tenantAdminControls ?? {}),
                    allowedPermissionToggles: {
                        ...DEFAULT_CONTROLS.allowedPermissionToggles,
                        ...(data?.settings?.tenantAdminControls?.allowedPermissionToggles ?? {}),
                    },
                },
            },
        }),
        [data],
    );

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <CardEditable
                    isLoading={isLoading}
                    initialValues={initialValues}
                    titleKey="tenants.globalSettings.title"
                    onSave={mutate}
                >
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.permissionsPageEnabled.title"
                            name={['settings', 'tenantAdminControls', 'permissionsPageEnabled']}
                            inline
                            disableLabels
                        />
                        <p className={styles.checkInfo}>
                            {t('tenants.globalSettings.permissionsPageEnabled.description')}
                        </p>
                    </div>

                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.anonymousChat"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'anonymousChat']}
                            inline
                            disableLabels
                        />
                    </div>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.calls"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'calls']}
                            inline
                            disableLabels
                        />
                    </div>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.supervision"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'supervision']}
                            inline
                            disableLabels
                        />
                    </div>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.audioCalls"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'audioCalls']}
                            inline
                            disableLabels
                        />
                    </div>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.videoCalls"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'videoCalls']}
                            inline
                            disableLabels
                        />
                    </div>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.threads"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'threads']}
                            inline
                            disableLabels
                        />
                    </div>
                    <div className={styles.checkGroup}>
                        <FormSwitchField
                            labelKey="tenants.globalSettings.allowedPermissionToggles.voiceMessages"
                            name={['settings', 'tenantAdminControls', 'allowedPermissionToggles', 'voiceMessages']}
                            inline
                            disableLabels
                        />
                    </div>
                </CardEditable>
            </Col>
        </Row>
    );
};
