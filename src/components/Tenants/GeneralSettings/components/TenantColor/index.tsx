import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { MuiColorField } from '../../../../mui/MuiColorField';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';

export const TenantColor = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { data: inheritedData } = usePublicTenantData();
    const { mutate } = useTenantAdminDataMutation({ id: tenantId });
    const primaryColorReadOnly =
        readOnly ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'primaryColor',
            'theming.primaryColor',
            'tenantPrimaryColor',
            'tenantThemingPrimaryColor',
            'brandingPrimaryColor',
        ]);
    const effectivePrimaryColor = data?.theming?.primaryColor || inheritedData?.theming?.primaryColor;
    const initialValues = {
        ...data,
        theming: {
            ...(data?.theming ?? {}),
            primaryColor: effectivePrimaryColor,
        },
    };
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
            key={`branding-color-${effectivePrimaryColor}-${primaryColorReadOnly}`}
            allowEdit={!primaryColorReadOnly}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="settings.colors"
            subTitle={t<string>('settings.colors.howto')}
            onSave={onSubmit}
        >
            <MuiColorField
                labelKey="organisation.primaryColor"
                name={['theming', 'primaryColor']}
                disabled={primaryColorReadOnly}
            />
        </CardEditable>
    );
};
