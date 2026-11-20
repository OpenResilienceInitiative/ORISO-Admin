import { useTranslation } from 'react-i18next';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { CardEditable } from '../../../../CardEditable';
import { FormFileUploaderField } from '../../../../FormFileUploaderField';
import { TileSections } from '../../../../TileSections';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import styles from './styles.module.scss';

export const LogoAndFavicon = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);
    const { data: inheritedData } = usePublicTenantData();
    const { settings } = useAppConfigContext();
    const logoReadOnly =
        readOnly ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'logo',
            'theming.logo',
            'tenantLogo',
            'tenantThemingLogo',
            'brandingLogo',
        ]);
    const faviconReadOnly =
        readOnly ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'favicon',
            'theming.favicon',
            'tenantFavicon',
            'tenantThemingFavicon',
            'brandingFavicon',
        ]);
    const associationLogoReadOnly =
        readOnly ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'associationLogo',
            'theming.associationLogo',
            'tenantAssociationLogo',
            'brandingAssociationLogo',
        ]);
    const initialValues = {
        ...data,
        theming: {
            ...(data?.theming ?? {}),
            logo: data?.theming?.logo || inheritedData?.theming?.logo,
            favicon: data?.theming?.favicon || inheritedData?.theming?.favicon,
            associationLogo: data?.theming?.associationLogo || inheritedData?.theming?.associationLogo,
        },
    };

    return (
        <CardEditable
            key={`branding-images-${initialValues.theming.logo}-${initialValues.theming.favicon}-${logoReadOnly}-${faviconReadOnly}-${associationLogoReadOnly}`}
            allowEdit={!logoReadOnly || !faviconReadOnly || !associationLogoReadOnly}
            readOnlyAccess={readOnly}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="settings.images.title"
            subTitle={t<string>('settings.images.howto')}
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<ImageOutlinedIcon />}
        >
            <TileSections>
                <TileSections.Section id="images-logo" title={t('organisation.logo')} note="512 × 512 px">
                    <FormFileUploaderField
                        name={['theming', 'logo']}
                        disabled={logoReadOnly}
                        row={{
                            inSection: true,
                            title: t('organisation.logo'),
                            description: `${t('settings.images.purpose.logo')} · ${t('settings.images.formats.photo')}`,
                        }}
                    />
                </TileSections.Section>
                <TileSections.Section id="images-favicon" title={t('organisation.favicon')} note="32 × 32 px">
                    <FormFileUploaderField
                        allowIcon
                        name={['theming', 'favicon']}
                        disabled={faviconReadOnly}
                        row={{
                            inSection: true,
                            title: t('organisation.favicon'),
                            description: `${t('settings.images.purpose.favicon')} · ${t(
                                'settings.images.formats.icon',
                            )}`,
                            previewClassName: styles.faviconPreview,
                        }}
                    />
                </TileSections.Section>
                {!settings.multitenancyWithSingleDomainEnabled && (
                    <TileSections.Section
                        id="images-association-logo"
                        title={t('organisation.associationLogo')}
                        note="512 × 512 px"
                    >
                        <FormFileUploaderField
                            name={['theming', 'associationLogo']}
                            disabled={associationLogoReadOnly}
                            row={{
                                inSection: true,
                                title: t('organisation.associationLogo'),
                                description: `${t('settings.images.purpose.associationLogo')} · ${t(
                                    'settings.images.formats.photo',
                                )}`,
                            }}
                        />
                    </TileSections.Section>
                )}
            </TileSections>
        </CardEditable>
    );
};
