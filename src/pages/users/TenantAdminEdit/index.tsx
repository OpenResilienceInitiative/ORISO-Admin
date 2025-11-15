import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Button, Col, Row, Form, notification } from 'antd';
import { FormInputField } from '../../../components/FormInputField';
import { Page } from '../../../components/Page';
import { SelectFormField } from '../../../components/SelectFormField';
import { useTenantUserAdminData } from '../../../hooks/useTenantUserAdminData';
import { Card } from '../../../components/Card';
import { useTenantsData } from '../../../hooks/useTenantsData';
import routePathNames from '../../../appConfig';
import { useAddOrUpdateTenantAdmin } from '../../../hooks/useAddOrUpdateTenantAdmin.hook';
import styles from './styles.module.scss';
import { getDomain } from '../../../utils/getDomain';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';

export const TenantAdminEditOrAdd = () => {
    const { search } = useLocation();
    const tenantId = new URLSearchParams(search).get('tenantId');
    const { can } = useUserPermissions();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const isEditing = id !== 'add';
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const { data, isLoading: isLoadingConsultants } = useTenantUserAdminData({ id, enabled: isEditing });
    const { data: tenants, isLoading } = useTenantsData({ perPage: 1000 });

    const { mutate } = useAddOrUpdateTenantAdmin({
        id: id !== 'add' ? id : '',
        onSuccess: () => {
            navigate(routePathNames.tenantAdmins);
            notification.success({
                message: t(`tenantAdmins.message.${isEditing ? 'update' : 'add'}`),
            });
        },
    });

    const onSave = useCallback((tmp: any) => mutate(tmp), []);
    const onCancel = useCallback(() => {
        if (isEditing) {
            setReadOnly(true);
        } else {
            navigate(routePathNames.tenantAdmins);
        }
    }, [isEditing]);

    const title = isEditing ? `${data?.firstname} ${data?.lastname}` : t('tenantAdmins.edit.back');

    return (
        <Page isLoading={isLoadingConsultants || isLoading}>
            <Page.BackWithActions path="/admin/users/tenant-admins" title={title}>
                {isReadOnly && (
                    <Button type="primary" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && (
                    <>
                        <Button type="default" onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                        <Button type="primary" onClick={() => form.submit()}>
                            {t('save')}
                        </Button>
                    </>
                )}
            </Page.BackWithActions>

            <Form
                disabled={isReadOnly}
                labelAlign="left"
                labelWrap
                layout="vertical"
                form={form}
                onFinish={onSave}
                initialValues={{ tenantId, ...data }}
            >
                <Row gutter={[24, 24]}>
                    <Col span={12} md={6}>
                        <Card titleKey="tenantAdmins.card.personalDataTitle">
                            <FormInputField
                                name="firstname"
                                labelKey="firstname"
                                placeholderKey="placeholder.firstname"
                                required
                            />
                            <FormInputField
                                name="lastname"
                                labelKey="lastname"
                                placeholderKey="placeholder.lastname"
                                required
                            />
                            <FormInputField
                                name="email"
                                labelKey="email"
                                placeholderKey="placeholder.email"
                                required
                                rules={[
                                    {
                                        type: 'email',
                                        message: t('message.error.email.incorrect'),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col span={12} md={6}>
                        <Card titleKey="tenantAdmins.card.tenantTitle">
                            <SelectFormField
                                name="tenantId"
                                placeholder="tenantAdmins.form.tenant"
                                required
                                disabled={isReadOnly || !can(PermissionAction.Update, Resource.TenantAdminUser)}
                                className={styles.select}
                            >
                                {tenants?.data.map((option) => (
                                    <SelectFormField.Option
                                        key={option.id}
                                        className={styles.option}
                                        value={String(option.id)}
                                        label={option.name}
                                    >
                                        <div className={styles.optionName}>{option.name}</div>
                                        <div className={styles.optionGroup}>
                                            <div className={styles.optionTenantId}>{option.id}</div>
                                            {' | '}
                                            <div className={styles.optionTenantSubdomain}>{getDomain()}</div>
                                        </div>
                                    </SelectFormField.Option>
                                ))}
                            </SelectFormField>
                        </Card>
                    </Col>
                </Row>
            </Form>
        </Page>
    );
};
