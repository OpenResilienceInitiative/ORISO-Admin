import { Button, Col, Form, notification, Row } from 'antd';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'antd/lib/form/Form';
import { useState } from 'react';
import { FormInputField } from '../../../../components/FormInputField';
import { FormInputNumberField } from '../../../../components/FormInputNumberField';
import { SelectFormField } from '../../../../components/SelectFormField';
import { getDomain } from '../../../../utils/getDomain';
import { CardEditable } from '../../../../components/CardEditable';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useAddOrUpdateTenant } from '../../../../hooks/useAddOrUpdateTenant.hook';
import routePathNames from '../../../../appConfig';
import styles from './styles.module.scss';
import { TenantAdminData } from '../../../../types/TenantAdminData';
import { ModalSuccess } from '../../../../components/ModalSuccess';
import { Card } from '../../../../components/Card';
import { X_REASON } from '../../../../api/fetchData';

export const GeneralTenantSettings = () => {
    const { search } = useLocation();
    const main = new URLSearchParams(search).get('main');
    const { id } = useParams<{ id: string }>();
    const isEditing = id !== 'add';
    const navigate = useNavigate();
    const [newTenantId, setNewTenantId] = useState<number>(null);
    const [form] = useForm();
    const { settings } = useAppConfigContext();
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id, enabled: isEditing });
    const { mutate: update } = useAddOrUpdateTenant({
        id: isEditing ? id : null,
        onSuccess: (rData) => {
            if (!isEditing) {
                setNewTenantId(rData.id);
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
    const isMainTenant = !!main || settings.mainTenantSubdomainForSingleDomainMultitenancy === data?.subdomain;

    return (
        <>
            {newTenantId && (
                <ModalSuccess
                    titleKey="tenants.created.modal.title"
                    onClose={() => navigate(routePathNames.tenants)}
                    contentKey="tenants.created.modal.description"
                    footer={
                        <Button
                            type="primary"
                            onClick={() => navigate(`${routePathNames.tenantAdmins}/add?tenantId=${newTenantId}`)}
                        >
                            {t('tenants.created.modal.link')}
                        </Button>
                    }
                />
            )}
            <Row gutter={[24, 24]}>
                <Col span={12} md={6}>
                    <CardEditable
                        isLoading={isLoading}
                        editMode={!isEditing}
                        hideCancelButton={!isEditing}
                        titleKey="tenants.add.mainTenantTitle"
                        initialValues={{ ...data }}
                        formProp={form}
                        onSave={(formData) => update(formData as unknown as TenantAdminData)}
                    >
                        <div className={styles.fieldGroup}>
                            <div className={styles.description}>{t('tenants.add.form.name.label')}</div>
                            <FormInputField name="name" placeholderKey="tenants.add.form.name.placeholder" required />
                        </div>
                        {(!settings.multitenancyWithSingleDomainEnabled ||
                            (settings.multitenancyWithSingleDomainEnabled && isMainTenant)) && (
                            <div className={styles.fieldGroup}>
                                <div className={styles.description}>{t('tenants.add.form.subdomain.label')}</div>
                                {isMainTenant && (
                                    <div className={styles.warning}>{t('tenants.add.form.subdomain.warning')}</div>
                                )}

                                <FormInputField
                                    name="subdomain"
                                    placeholderKey="tenants.add.form.subdomain.placeholder"
                                    required
                                    addonAfter={getDomain()}
                                    disabled={isMainTenant && isEditing}
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
                    </CardEditable>
                </Col>
                {isEditing && (
                    <Col span={12} md={6}>
                        <Card
                            isLoading={isLoading}
                            titleKey="tenants.edit.adminEmailsCardTitle"
                            tooltip={t('tenants.edit.adminEmailsCardTooltip')}
                        >
                            <Form disabled initialValues={{ ...data }}>
                                {data?.adminEmails?.length && (
                                    <SelectFormField name="adminEmails" required disabled isMulti />
                                )}
                                {!data?.adminEmails?.length && (
                                    <div className={styles.emptyAdminsContainer}>
                                        <PersonSearchIcon className={styles.emptyAdminsIcon} />

                                        <div className={styles.emptyAdminsText}>
                                            {t('tenants.edit.adminEmailsCardEmpty')}
                                        </div>
                                    </div>
                                )}
                            </Form>
                        </Card>
                    </Col>
                )}
            </Row>
        </>
    );
};
