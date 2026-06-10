import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormColorSelectorField } from '../../../../FormColorSelectorField';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import { buildSeedUpdate, readSeeds } from '../../../../../utils/themeSeeds';

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
    // Legacy records carry only primaryColor (+ a mirrored secondaryColor);
    // readSeeds maps both shapes onto the seed model.
    const storedSeeds = readSeeds(data?.theming);
    const effectivePrimaryColor = storedSeeds.primary || readSeeds(inheritedData?.theming).primary;
    const initialValues = {
        ...data,
        theming: {
            ...(data?.theming ?? {}),
            primaryColor: effectivePrimaryColor,
        },
    };
    const onSubmit = (values) => {
        mutate({
            // Seeds only — the palette is computed on use. Accent/signal are
            // not edited on this card, so the stored values pass through.
            theming: buildSeedUpdate({
                ...storedSeeds,
                primary: values.theming.primaryColor,
            }),
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
            <FormColorSelectorField
                labelKey="organisation.primaryColor"
                name={['theming', 'primaryColor']}
                disabled={primaryColorReadOnly}
            />
        </CardEditable>
    );
};
