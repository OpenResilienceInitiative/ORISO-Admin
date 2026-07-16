import { useTranslation } from 'react-i18next';
import TitleOutlinedIcon from '@mui/icons-material/TitleOutlined';
import { CardEditable } from '../../../../CardEditable';
import { FormInputField } from '../../../../FormInputField';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import styles from './styles.module.scss';

export const NameAndSlogan = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);

    return (
        <CardEditable
            key={`name-slogan-${tenantId}-${readOnly}`}
            allowEdit={!readOnly}
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="organisations.nameAndSlugTitle"
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<TitleOutlinedIcon />}
        >
            <p className={styles.description}>
                {t('organisations.nameAndSlugTitleSubtitle')} {t('settings.name.help')}
            </p>

            <FormInputField name="name" labelKey="organisation.name" placeholderKey="slogan" required />

            <FormInputField
                name={['content', 'claim', 'de']}
                labelKey="organisation.claim"
                placeholderKey="subSlogan"
                required
            />
        </CardEditable>
    );
};
