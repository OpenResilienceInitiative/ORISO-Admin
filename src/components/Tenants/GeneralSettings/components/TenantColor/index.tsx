import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormColorSelectorField } from '../../../../FormColorSelectorField';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';

export const TenantColor = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({ id: tenantId });
    const onSubmit = (values) => {
        mutate({
            theming: {
                primaryColor: values.theming.primaryColor,
                secondaryColor: values.theming.primaryColor,
            },
        });
    };

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="settings.colors"
            subTitle={t<string>('settings.colors.howto')}
            onSave={onSubmit}
        >
            <FormColorSelectorField labelKey="organisation.primaryColor" name={['theming', 'primaryColor']} />
        </CardEditable>
    );
};
