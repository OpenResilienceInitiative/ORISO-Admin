import { Col, Row } from 'antd';
import { useMemo } from 'react';
import { Page } from '../../components/Page';
import { CardEditable } from '../../components/CardEditable';
import { FormSwitchField } from '../../components/FormSwitchField';
import { useTenantData } from '../../hooks/useTenantData.hook';
import { useTenantAdminDataMutation } from '../../hooks/useTenantAdminDataMutation.hook';
import styles from '../Tenants/Edit/GlobalSettings/styles.module.scss';

export const GlobalSettingsPage = () => {
    const { data, isLoading } = useTenantData();
    const tenantId = data?.id ? `${data.id}` : '';
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const initialValues = useMemo(() => ({ ...data }), [data]);

    return (
        <Page>
            <Page.Title titleKey="globalSettings.pageTitle" />
            <Row gutter={[24, 24]}>
                <Col span={12} sm={6}>
                    <CardEditable
                        isLoading={isLoading}
                        initialValues={initialValues}
                        titleKey="tenants.globalSettings.anonymousChat.title"
                        onSave={mutate}
                    >
                        <div className={styles.checkGroup}>
                            <FormSwitchField
                                labelKey="tenants.permissions.anonymousChat.title"
                                name={['settings', 'featureAnonymousChatEnabled']}
                                inline
                                disableLabels
                            />
                        </div>
                    </CardEditable>
                </Col>
            </Row>
        </Page>
    );
};

