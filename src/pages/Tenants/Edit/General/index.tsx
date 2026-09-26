import { ReactNode } from 'react';
import { Form, notification } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'antd/lib/form/Form';
import { ThemeProvider } from '@mui/material/styles';
import { deleteTenantData } from '../../../../api/tenant/deleteTenantData';
import { getDomain } from '../../../../utils/getDomain';
import { CardEditable } from '../../../../components/CardEditable';
import { Card } from '../../../../components/Card';
import { CardDeck } from '../../../../components/CardDeck';
import { CardGrid } from '../../../../components/CardGrid';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useAddOrUpdateTenant } from '../../../../hooks/useAddOrUpdateTenant.hook';
import { useAddOrUpdateTenantAdmin } from '../../../../hooks/useAddOrUpdateTenantAdmin.hook';
import routePathNames from '../../../../appConfig';
import styles from './styles.module.scss';
import { passwordFormRules } from '../../../../utils/consultantCredentialRules';
import { TenantAdminData } from '../../../../types/TenantAdminData';
import { createTenantSaveErrorHandler } from '../../../../utils/tenantSaveErrorHandler';
import { extractApiErrorMessage } from '../../../../utils/extractApiErrorMessage';
import { M3Button } from '../../../../components/M3Button';
import { orisoMuiTheme } from '../../../../theme/orisoMuiTheme';
import {
    MuiFormField,
    MuiNumberFormField,
    MuiPasswordFormField,
    MuiMultilineFormField,
} from '../../../../components/mui/MuiFormField';
import { SUBDOMAIN_PATTERN } from '../../../../utils/isValidSubdomain';
import { TraegerSenderFields } from '../../../../components/Tenants/TraegerSenderFields';
import { TraegerDpoFields } from '../../../../components/Tenants/TraegerDpoFields';

// Module level, so React does not see a new component type on every render.
const wrapInFieldGroup = (field: ReactNode, name: string) => (
    <div key={name} className={styles.fieldGroup}>
        {field}
    </div>
);

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

    const shouldShowSubdomainField = !settings.multitenancyWithSingleDomainEnabled;

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
                    const rollbackAndExit = async (error?: unknown) => {
                        const conflictMessage = error
                            ? await extractApiErrorMessage(error)
                            : t('message.error.default');
                        deleteTenantData(rData.id)
                            .catch(() => undefined)
                            .finally(() => {
                                notification.error({ message: conflictMessage });
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
        onError: createTenantSaveErrorHandler({
            t,
            setFieldError: (name, error) => form.setFields([{ name, errors: [error] }]),
            notifyError: (message) => notification.error({ message }),
            canShowSubdomainError: shouldShowSubdomainField,
        }),
    });

    const handleSave = (formData: Record<string, any>) => {
        // `topic` is frontend-only — strip it before it reaches the mutation.
        const { topic, ...rest } = formData;
        update(rest as unknown as TenantAdminData);
    };

    const requiredRule = { required: true, message: t('form.errors.required') };
    const subdomainFormatRule = {
        pattern: SUBDOMAIN_PATTERN,
        message: t('tenants.add.form.subdomain.invalid'),
    };

    // ----- EDIT MODE: single editable card (migrated to MUI fields) -----
    if (isEditing) {
        return (
            <ThemeProvider theme={orisoMuiTheme}>
                <CardDeck
                    ariaLabel={t('tenants.add.mainTenantTitle')}
                    className={styles.tenantCardDeck}
                    deckClassName={styles.tenantCardDeckScroll}
                    previousLabel={t('agency.cardDeck.previous')}
                    nextLabel={t('agency.cardDeck.next')}
                >
                    <CardDeck.Item className={styles.tenantCardDeckItem}>
                        <CardEditable
                            isLoading={isLoading}
                            editMode={false}
                            titleKey="tenants.add.mainTenantTitle"
                            variant="dialog"
                            editButtonPlacement="footer"
                            initialValues={data ? (data as unknown as Record<string, unknown>) : {}}
                            formProp={form}
                            onSave={handleSave}
                            className={styles.tenantInfoCard}
                        >
                            <div className={styles.fieldGroup}>
                                <MuiFormField
                                    name="name"
                                    label={t('tenants.add.form.name.placeholder')}
                                    required
                                    rules={[requiredRule]}
                                />
                            </div>
                            {shouldShowSubdomainField && (
                                <div className={styles.fieldGroup}>
                                    <MuiFormField
                                        name="subdomain"
                                        label={t('tenants.add.form.subdomain.placeholder')}
                                        disabled
                                        endAdornment={<span className={styles.domainSuffix}>.{getDomain()}</span>}
                                    />
                                </div>
                            )}
                            <div className={styles.fieldGroup}>
                                <MuiNumberFormField
                                    name={['licensing', 'allowedNumberOfUsers']}
                                    label={t('tenants.add.form.allowedConsultantsLicense.placeholder')}
                                    required
                                    min={1}
                                    rules={[requiredRule]}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <MuiFormField
                                    name="address"
                                    label={t('tenants.add.form.address.label')}
                                    placeholder={t('tenants.add.form.address.placeholder')}
                                />
                            </div>
                            <TraegerSenderFields wrapField={wrapInFieldGroup} />
                            <div className={styles.fieldGroup}>
                                <MuiMultilineFormField
                                    name="description"
                                    label={t('tenants.add.form.description.label')}
                                    placeholder={t('tenants.add.form.description.placeholder')}
                                />
                            </div>
                            <TraegerDpoFields wrapField={wrapInFieldGroup} />
                        </CardEditable>
                    </CardDeck.Item>
                </CardDeck>
            </ThemeProvider>
        );
    }

    // ----- CREATE MODE: two side-by-side cards in a single antd Form -----
    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} onFinish={handleSave} layout="vertical">
                <CardGrid minCardWidth={425} maxColumns={2}>
                    <Card
                        titleKey="tenants.add.mainTenantTitle"
                        fullHeight
                        variant="dialog"
                        autoHeight
                        className={styles.createCard}
                    >
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="name"
                                label={t('tenants.add.form.name.placeholder')}
                                required
                                rules={[requiredRule]}
                            />
                        </div>
                        {shouldShowSubdomainField && (
                            <div className={styles.fieldGroup}>
                                <MuiFormField
                                    name="subdomain"
                                    label={t('tenants.add.form.subdomain.placeholder')}
                                    required
                                    rules={[requiredRule, subdomainFormatRule]}
                                    endAdornment={<span className={styles.domainSuffix}>.{getDomain()}</span>}
                                />
                            </div>
                        )}
                        <div className={styles.fieldGroup}>
                            <MuiNumberFormField
                                name={['licensing', 'allowedNumberOfUsers']}
                                label={t('tenants.add.form.allowedConsultantsLicense.placeholder')}
                                required
                                min={1}
                                rules={[requiredRule]}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="address"
                                label={t('tenants.add.form.address.label')}
                                placeholder={t('tenants.add.form.address.placeholder')}
                            />
                        </div>
                        <TraegerSenderFields wrapField={wrapInFieldGroup} />
                        <div className={styles.fieldGroup}>
                            <MuiMultilineFormField
                                name="description"
                                label={t('tenants.add.form.description.label')}
                                placeholder={t('tenants.add.form.description.placeholder')}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="topic"
                                label={t('tenants.add.form.topic.label')}
                                placeholder={t('tenants.add.form.topic.placeholder')}
                                helpText={t('tenants.add.form.topic.info')}
                            />
                        </div>
                    </Card>
                    <Card
                        titleKey="tenants.add.adminCardTitle"
                        fullHeight
                        variant="dialog"
                        autoHeight
                        className={styles.createCard}
                        footer={
                            <>
                                <M3Button onClick={() => navigate(routePathNames.tenants)}>
                                    {t('card.edit.cancel')}
                                </M3Button>
                                <M3Button onClick={() => form.submit()}>{t('card.edit.save')}</M3Button>
                            </>
                        }
                    >
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="tenantAdminUsername"
                                label={t('tenantAdmins.form.username')}
                                placeholder={t('placeholder.username')}
                                required
                                rules={[
                                    requiredRule,
                                    {
                                        pattern: /^[a-z0-9_-]+$/,
                                        message: t('message.error.username.format'),
                                    },
                                ]}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <MuiPasswordFormField
                                name="tenantAdminPassword"
                                label={t('tenantAdmins.form.password')}
                                placeholder={t('placeholder.password')}
                                helpText={t('tenantAdmins.form.password.hint')}
                                required
                                rules={[requiredRule, ...passwordFormRules(t)]}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="tenantAdminEmail"
                                label={t('email')}
                                placeholder={t('placeholder.email')}
                                type="email"
                                required
                                rules={[
                                    requiredRule,
                                    {
                                        type: 'email',
                                        message: t('message.error.email.incorrect'),
                                    },
                                ]}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="tenantAdminFirstname"
                                label={t('firstname')}
                                placeholder={t('placeholder.firstname')}
                                required
                                rules={[requiredRule]}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="tenantAdminLastname"
                                label={t('lastname')}
                                placeholder={t('placeholder.lastname')}
                                required
                                rules={[requiredRule]}
                            />
                        </div>
                    </Card>
                </CardGrid>
            </Form>
        </ThemeProvider>
    );
};
