import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Row, Form, notification } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { MuiFormField, MuiPasswordFormField } from '../../../components/mui/MuiFormField';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { Page } from '../../../components/Page';
import { MuiSelectField } from '../../../components/mui/MuiSelectField';
import { useTenantUserAdminData } from '../../../hooks/useTenantUserAdminData';
import { Card } from '../../../components/Card';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import routePathNames from '../../../appConfig';
import { useAddOrUpdateTenantAdmin } from '../../../hooks/useAddOrUpdateTenantAdmin.hook';
import styles from './styles.module.scss';
import { getDomain } from '../../../utils/getDomain';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { extractApiErrorMessage } from '../../../utils/extractApiErrorMessage';
import { GrantConsultantIdentityModal } from '../../../components/GrantConsultantIdentityModal';
import { canGrantConsultantIdentity } from '../../../utils/canGrantConsultantIdentity';
import { CounselorData } from '../../../types/counselor';
import { TypeOfUser } from '../../../enums/TypeOfUser';

export const TenantAdminEditOrAdd = () => {
    const { search, pathname } = useLocation();
    // Platform admins are tenant admins with the fixed platform id 0 (MT-04-12)
    const isPlatformAdmin = pathname.includes('/platform-admins/');
    const { isSuperAdmin, isTenantScopedAdmin, tenantId: ownTenantId } = useUserRoles();
    // A scoped admin always uses their own tenant, regardless of query parameters.
    const queryTenantId = new URLSearchParams(search).get('tenantId');
    const lockTenantToOwn = isTenantScopedAdmin && !isPlatformAdmin;
    const tenantId = (() => {
        if (isPlatformAdmin) return '0';
        if (lockTenantToOwn && ownTenantId !== null) return String(ownTenantId);
        return queryTenantId;
    })();
    const listPath = isPlatformAdmin ? routePathNames.platformAdmins : routePathNames.tenantAdmins;
    const { can } = useUserPermissions();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const isEditing = id !== 'add';
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const { data, isLoading: isLoadingConsultants } = useTenantUserAdminData({ id, enabled: isEditing });
    // Tenant-scoped admins may not list all tenants — and the locked field only ever
    // shows their own, which useTenantData already provides.
    const { data: tenants, isLoading } = useTenantsData({
        perPage: 1000,
        enabled: !isPlatformAdmin && isSuperAdmin,
    });
    const { data: ownTenant, isLoading: isLoadingOwnTenant, isError: isOwnTenantError } = useTenantData();
    const hasOwnTenant = isTenantScopedAdmin && ownTenantId !== null && ownTenantId > 0;
    const scopeAllowed = isSuperAdmin || (!isPlatformAdmin && hasOwnTenant);
    const recordAllowed =
        !isEditing || (data != null && (isSuperAdmin || String(data.tenantId) === String(ownTenantId)));
    const ownTenantReady = isSuperAdmin || (!isLoadingOwnTenant && !isOwnTenantError && ownTenant?.id === ownTenantId);
    const canCreate = scopeAllowed && ownTenantReady && can(PermissionAction.Create, Resource.TenantAdminUser);
    const canUpdate =
        scopeAllowed && ownTenantReady && recordAllowed && can(PermissionAction.Update, Resource.TenantAdminUser);
    const canWrite = isEditing ? canUpdate : canCreate;

    const tenantOptions = useMemo(() => {
        if (lockTenantToOwn) {
            return ownTenant?.id != null ? [{ id: ownTenant.id, name: ownTenant.name }] : [];
        }
        return tenants?.data ?? [];
    }, [lockTenantToOwn, ownTenant?.id, ownTenant?.name, tenants?.data]);

    const { mutate } = useAddOrUpdateTenantAdmin({
        id: id !== 'add' ? id : '',
        onSuccess: () => {
            navigate(listPath);
            notification.success({
                message: t(`tenantAdmins.message.${isEditing ? 'update' : 'add'}`),
            });
        },
        onError: async (error) => {
            const content = await extractApiErrorMessage(error);
            notification.error({
                message: content,
                duration: 8,
            });
        },
    });

    const onSave = useCallback(
        (values: CounselorData) => {
            if (!canWrite || isReadOnly) return;
            if (!isSuperAdmin && String(values.tenantId) !== String(ownTenantId)) return;
            mutate(isPlatformAdmin ? { ...values, tenantId: '0' } : values);
        },
        [canWrite, isReadOnly, isSuperAdmin, ownTenantId, mutate, isPlatformAdmin],
    );
    const onCancel = useCallback(() => {
        if (isEditing) {
            setReadOnly(true);
        } else {
            navigate(listPath);
        }
    }, [isEditing, listPath]);

    const title = isEditing ? `${data?.firstname} ${data?.lastname}` : t('tenantAdmins.edit.back');
    const requiredRule = { required: true, message: t('form.errors.required') };
    // Platform admins stay excluded from the grant mechanism (route is shared).
    const showGrantConsultantIdentity =
        !isPlatformAdmin &&
        scopeAllowed &&
        recordAllowed &&
        canGrantConsultantIdentity(isEditing, TypeOfUser.TenantAdmins, data);

    return (
        <Page isLoading={isLoadingConsultants || isLoading}>
            <Page.BackWithActions path={listPath} title={title}>
                {showGrantConsultantIdentity && (
                    <GrantConsultantIdentityModal
                        adminId={id}
                        tenantId={data?.tenantId}
                        onSuccess={() => navigate(listPath)}
                    />
                )}
                {isReadOnly && canUpdate && (
                    <Button type="primary" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && canWrite && (
                    <>
                        <Button type="text" className="admin-m3-text-button" onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                        <Button type="primary" onClick={() => form.submit()}>
                            {t('save')}
                        </Button>
                    </>
                )}
            </Page.BackWithActions>

            <ThemeProvider theme={orisoMuiTheme}>
                <Form
                    disabled={isReadOnly || !canWrite}
                    labelAlign="left"
                    labelWrap
                    layout="vertical"
                    form={form}
                    onFinish={onSave}
                    initialValues={{ tenantId, ...data }}
                >
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card titleKey="tenantAdmins.card.personalDataTitle">
                                <MuiFormField
                                    name="firstname"
                                    label={t('firstname')}
                                    placeholder={t('placeholder.firstname')}
                                    required
                                    rules={[requiredRule]}
                                />
                                <MuiFormField
                                    name="lastname"
                                    label={t('lastname')}
                                    placeholder={t('placeholder.lastname')}
                                    required
                                    rules={[requiredRule]}
                                />
                                <MuiFormField
                                    name="email"
                                    label={t('email')}
                                    placeholder={t('placeholder.email')}
                                    required
                                    rules={[
                                        requiredRule,
                                        {
                                            type: 'email',
                                            message: t('message.error.email.incorrect'),
                                        },
                                    ]}
                                />
                            </Card>
                        </Col>
                        {!isEditing && (
                            <Col xs={24} lg={12}>
                                <Card titleKey="tenantAdmins.card.credentialsTitle">
                                    <MuiFormField
                                        name="username"
                                        label={t('tenantAdmins.form.username')}
                                        placeholder={t('tenantAdmins.form.username')}
                                        helpText={t('tenantAdmins.hint.username')}
                                    />
                                    <MuiPasswordFormField
                                        name="password"
                                        label={t('tenantAdmins.form.password')}
                                        placeholder={t('placeholder.password')}
                                        helpText={t('tenantAdmins.hint.password')}
                                        rules={[
                                            {
                                                validator: (_, value) =>
                                                    !value || value.length >= 8
                                                        ? Promise.resolve()
                                                        : Promise.reject(
                                                              new Error(t('message.error.password.minLength')),
                                                          ),
                                            },
                                        ]}
                                    />
                                </Card>
                            </Col>
                        )}
                        {!isPlatformAdmin && (
                            <Col xs={24} lg={12}>
                                <Card titleKey="tenantAdmins.card.tenantTitle">
                                    <MuiSelectField
                                        name="tenantId"
                                        placeholder="tenantAdmins.form.tenant"
                                        required
                                        disabled={isReadOnly || lockTenantToOwn || !canWrite}
                                        className={styles.select}
                                    >
                                        {tenantOptions.map((option) => (
                                            <MuiSelectField.Option
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
                                            </MuiSelectField.Option>
                                        ))}
                                    </MuiSelectField>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </Form>
            </ThemeProvider>
        </Page>
    );
};
