import type { ReactNode } from 'react';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { CardEditable } from '../../../../components/CardEditable';
import { MuiFormField, MuiNumberFormField, MuiMultilineFormField } from '../../../../components/mui/MuiFormField';
import { TraegerSenderFields } from '../../../../components/Tenants/TraegerSenderFields';
import { TraegerDpoFields } from '../../../../components/Tenants/TraegerDpoFields';
import { getDomain } from '../../../../utils/getDomain';
import styles from './styles.module.scss';

type Props = {
    form: FormInstance;
    initialValues: Record<string, unknown>;
    isLoading: boolean;
    shouldShowSubdomainField: boolean;
    onSave: (values: Record<string, any>) => void;
};

const wrapInFieldGroup = (field: ReactNode, name: string) => (
    <div key={name} className={styles.fieldGroup}>
        {field}
    </div>
);

export const TenantInformationCard = ({ form, initialValues, isLoading, shouldShowSubdomainField, onSave }: Props) => {
    const { t } = useTranslation();
    const requiredRule = { required: true, message: t('form.errors.required') };
    return (
        <CardEditable
            isLoading={isLoading}
            editMode={false}
            titleKey="tenants.add.mainTenantTitle"
            headerIcon={<BusinessOutlinedIcon />}
            variant="dialog"
            editButtonPlacement="footer"
            initialValues={initialValues}
            formProp={form}
            onSave={onSave}
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
    );
};
