import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'antd/lib/form/Form';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { CardEditable } from '../../CardEditable';
import { MuiFormField, MuiMultilineFormField } from '../../mui/MuiFormField';
import { TraegerSenderFields } from '../TraegerSenderFields';
import { TraegerDpoFields } from '../TraegerDpoFields';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import styles from './styles.module.scss';

const wrapInFieldGroup = (field: ReactNode, name: string) => (
    <div key={name} className={styles.fieldGroup}>
        {field}
    </div>
);

/**
 * The Träger information a Träger admin entered (or the platform admin entered for them) when the
 * Träger was created: name, address, sender block, description and data protection officer
 * (ORISO-Admin#1466). Until now only the platform admin's Träger page showed it, so a Träger admin
 * had nowhere to look. The card is read-only here: changing the Träger record, its licence included,
 * stays with the platform admin; name and slogan are edited in their own tile.
 */
export const OwnTenantInformation = () => {
    const { data, isLoading } = useTenantData();
    const [form] = useForm();

    // CardEditable seeds its form from `initialValues` once; push late-arriving tenant data in.
    useEffect(() => {
        if (data) {
            form.setFieldsValue(data);
        }
    }, [data, form]);

    const { t } = useTranslation();

    return (
        <CardEditable
            isLoading={isLoading}
            allowEdit={false}
            editMode={false}
            titleKey="tenants.add.mainTenantTitle"
            headerIcon={<BusinessOutlinedIcon />}
            variant="dialog"
            editButtonPlacement="footer"
            initialValues={data ? (data as unknown as Record<string, unknown>) : {}}
            formProp={form}
            onSave={() => undefined}
            className={styles.card}
        >
            <div className={styles.fieldGroup}>
                <MuiFormField name="name" label={t('tenants.add.form.name.placeholder')} />
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
