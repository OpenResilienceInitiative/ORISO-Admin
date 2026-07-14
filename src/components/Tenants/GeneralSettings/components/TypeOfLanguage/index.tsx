import { useTranslation } from 'react-i18next';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import { CardEditable } from '../../../../CardEditable';
import { FormRadioGroupField } from '../../../../FormRadioGroupField';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import styles from './styles.module.scss';

export const TypeOfLanguage = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);

    return (
        <CardEditable
            key={`type-of-language-${tenantId}-${readOnly}`}
            allowEdit={!readOnly}
            className={styles.card}
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.typeOfLanguage.title"
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<TranslateOutlinedIcon />}
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
