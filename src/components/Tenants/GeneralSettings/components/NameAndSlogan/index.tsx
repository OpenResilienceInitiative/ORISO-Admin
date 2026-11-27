import { useTranslation } from 'react-i18next';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import TitleOutlinedIcon from '@mui/icons-material/TitleOutlined';
import { CardEditable } from '../../../../CardEditable';
import { FormInputField } from '../../../../FormInputField';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';

export const NameAndSlogan = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);

    return (
        <CardEditable
            key={`name-slogan-${tenantId}-${readOnly}`}
            allowEdit={!readOnly}
            readOnlyAccess={readOnly}
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="organisations.nameAndSlugTitle"
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<TitleOutlinedIcon />}
            note={{
                icon: <PublicOutlinedIcon />,
                text: `${t('organisations.nameAndSlugTitleSubtitle')} ${t('settings.name.help')}`,
            }}
        >
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
