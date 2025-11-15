import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormRadioGroupField } from '../../../../FormRadioGroupField';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

export const TypeOfLanguage = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({ id: tenantId });

    return (
        <CardEditable
            className={styles.card}
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.typeOfLanguage.title"
            onSave={mutate}
        >
            <FormRadioGroupField
                labelKey="tenants.typeOfLanguage.radio.description"
                name={['settings', 'extendedSettings', 'languageFormal']}
                vertical
                className={styles.radio}
            >
                <FormRadioGroupField.Radio value>{t('tenants.typeOfLanguage.radio.formal')}</FormRadioGroupField.Radio>
                <FormRadioGroupField.Radio value={false}>
                    {t('tenants.typeOfLanguage.radio.informal')}
                </FormRadioGroupField.Radio>
            </FormRadioGroupField>
        </CardEditable>
    );
};
