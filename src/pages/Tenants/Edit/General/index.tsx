import { Col, notification, Row } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'antd/lib/form/Form';
import { deleteTenantData } from '../../../../api/tenant/deleteTenantData';
import { FormInputField } from '../../../../components/FormInputField';
import { FormInputNumberField } from '../../../../components/FormInputNumberField';
import { FormPasswordField } from '../../../../components/FormPasswordField';
import { getDomain } from '../../../../utils/getDomain';
import { CardEditable } from '../../../../components/CardEditable';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useAddOrUpdateTenant } from '../../../../hooks/useAddOrUpdateTenant.hook';
import { useAddOrUpdateTenantAdmin } from '../../../../hooks/useAddOrUpdateTenantAdmin.hook';
import routePathNames from '../../../../appConfig';
import styles from './styles.module.scss';
import { TenantAdminData } from '../../../../types/TenantAdminData';
import { X_REASON } from '../../../../api/fetchData';

export const GeneralTenantSettings = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = id !== 'add';
    const navigate = useNavigate();
    const [form] = useForm();
    const { settings } = useAppConfigContext();
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id, enabled: isEditing });
    const { mutate: createTenantAdmin } = useAddOrUpdateTenantAdmin({});

    const extractTenantAdminPayload = (formData?: Record<string, any>) => {
        if (!formData) return null;
        const {
            tenantAdminUsername,
            tenantAdminPassword,
            tenantAdminEmail,
            tenantAdminFirstname,
            tenantAdminLastname,
        } = formData;
        if (
            !tenantAdminUsername ||
            !tenantAdminPassword ||
            !tenantAdminEmail ||
            !tenantAdminFirstname ||
            !tenantAdminLastname
        ) {
            return null;
        }
        return {
            username: tenantAdminUsername,
            password: tenantAdminPassword,
            email: tenantAdminEmail,
            firstname: tenantAdminFirstname,
            lastname: tenantAdminLastname,
        };
    };

    const { mutate: update } = useAddOrUpdateTenant({
        id: isEditing ? id : null,
        onSuccess: (rData, submittedFormData) => {
            if (!isEditing) {
                const tenantAdminPayload = extractTenantAdminPayload(submittedFormData as Record<string, any>);
                if (tenantAdminPayload) {
                    const payload = {
                        ...tenantAdminPayload,
                        tenantId: String(rData.id),
                    } as any;
                    const completeSuccess = () => {
                        notification.success({ message: t('tenants.created.modal.title') });
                        navigate(routePathNames.tenants);
                    };
                    const rollbackAndExit = () => {
                        deleteTenantData(rData.id)
                            .catch(() => undefined)
                            .finally(() => {
                                notification.error({ message: t('message.error.default') });
                                navigate(routePathNames.tenants);
                            });
                    };

                    createTenantAdmin(payload, {
                        onSuccess: completeSuccess,
                        onError: rollbackAndExit,
                    });
                } else {
                    notification.success({ message: t('tenants.created.modal.title') });
                    navigate(routePathNames.tenants);
                }
                return;
            }

            if (data?.licensing?.allowedNumberOfUsers !== rData?.licensing?.allowedNumberOfUsers) {
                notification.success({ message: t('tenants.message.consultantsChangedSuccess') });
            } else {
                notification.success({ message: t('tenants.message.update') });
            }
            navigate(routePathNames.tenants);
        },
        onError: (error: Response | Error) => {
            if (error instanceof Response && error.headers?.get('X-Reason') === X_REASON.SUBDOMAIN_NOT_UNIQUE) {
                form.setFields([
                    {
                        name: 'subdomain',
                        errors: [t('tenants.message.subdomainInUse')],
                    },
                ]);
            } else {
                notification.error({ message: t('message.error.default') });
            }
        },
    });
    const shouldShowSubdomainField = !settings.multitenancyWithSingleDomainEnabled;

    const handleSave = (formData: Record<string, any>) => {
        update(formData as unknown as TenantAdminData);
    };

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} md={6}>
                <CardEditable
                    isLoading={isLoading}
                    editMode={!isEditing}
                    hideCancelButton={!isEditing}
                    titleKey="tenants.add.mainTenantTitle"
                    initialValues={isEditing && data ? (data as unknown as Record<string, unknown>) : {}}
                    formProp={form}
                    onSave={handleSave}
                >
                    <div className={styles.fieldGroup}>
                        <div className={styles.description}>{t('tenants.add.form.name.label')}</div>
                        <FormInputField name="name" placeholderKey="tenants.add.form.name.placeholder" required />
                    </div>
                    {shouldShowSubdomainField && (
                        <div className={styles.fieldGroup}>
                            <div className={styles.description}>{t('tenants.add.form.subdomain.label')}</div>
                            <FormInputField
                                name="subdomain"
                                placeholderKey="tenants.add.form.subdomain.placeholder"
                                required
                                addonAfter={getDomain()}
                                disabled={isEditing}
                            />
                        </div>
                    )}
                    <div className={styles.fieldGroup}>
                        <div className={styles.description}>
                            {t('tenants.add.form.allowedConsultantsLicense.label')}
                        </div>
                        <FormInputNumberField
                            name={['licensing', 'allowedNumberOfUsers']}
                            placeholderKey="tenants.add.form.allowedConsultantsLicense.placeholder"
                            required
                            min={1}
                        />
                    </div>
                    {!isEditing && (
                        <>
                            <div className={styles.fieldGroup}>
                                <div className={styles.description}>{t('tenantAdmins.form.username')}</div>
                                <FormInputField
                                    name="tenantAdminUsername"
                                    placeholderKey="placeholder.username"
                                    required
                                    rules={[
                                        {
                                            pattern: /^[a-z0-9_-]+$/,
                                            message: t('message.error.username.format'),
                                        },
                                    ]}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <div className={styles.description}>{t('tenantAdmins.form.password')}</div>
                                <FormPasswordField
                                    name="tenantAdminPassword"
                                    placeholderKey="placeholder.password"
                                    required
                                    rules={[
                                        {
                                            min: 8,
                                            message: t('message.error.password.minLength'),
                                        },
                                    ]}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <div className={styles.description}>{t('email')}</div>
                                <FormInputField
                                    name="tenantAdminEmail"
                                    placeholderKey="placeholder.email"
                                    required
                                    rules={[
                                        {
                                            type: 'email',
                                            message: t('message.error.email.incorrect'),
                                        },
                                    ]}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <div className={styles.description}>{t('firstname')}</div>
                                <FormInputField
                                    name="tenantAdminFirstname"
                                    placeholderKey="placeholder.firstname"
                                    required
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <div className={styles.description}>{t('lastname')}</div>
                                <FormInputField
                                    name="tenantAdminLastname"
                                    placeholderKey="placeholder.lastname"
                                    required
                                />
                            </div>
                        </>
                    )}
                </CardEditable>
            </Col>
        </Row>
    );
};
