import { Col, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormFileUploaderField } from '../../../../FormFileUploaderField';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import { useAppConfigContext } from '../../../../../context/useAppConfig';

const isReadOnlySetting = (meta: Record<string, { readOnly?: boolean }> | undefined, keys: string[]) =>
    keys.some((key) => meta?.[key]?.readOnly);

export const LogoAndFavicon = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { data: inheritedData } = usePublicTenantData();
    const { mutate } = useTenantAdminDataMutation({ id: tenantId });
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
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="settings.images.title"
            subTitle={t<string>('settings.images.howto')}
            onSave={mutate}
        >
            <Row gutter={15}>
                <Col xs={6} md={5} lg={4}>
                    <FormFileUploaderField
                        labelKey="organisation.logo"
                        name={['theming', 'logo']}
                        tooltip={t('settings.images.tooltip.logo')}
                        disabled={logoReadOnly}
                    />
                </Col>
                <Col xs={6} md={5} lg={4}>
                    <FormFileUploaderField
                        allowIcon
                        labelKey="organisation.favicon"
                        name={['theming', 'favicon']}
                        tooltip={t('settings.images.tooltip.favicon')}
                        disabled={faviconReadOnly}
                    />
                </Col>
                {!settings.multitenancyWithSingleDomainEnabled && (
                    <Col xs={6} md={5} lg={4}>
                        <FormFileUploaderField
                            labelKey="organisation.associationLogo"
                            name={['theming', 'associationLogo']}
                            tooltip={t('settings.images.tooltip.associationLogo')}
                            disabled={associationLogoReadOnly}
                        />
                    </Col>
                )}
            </Row>
        </CardEditable>
    );
};
