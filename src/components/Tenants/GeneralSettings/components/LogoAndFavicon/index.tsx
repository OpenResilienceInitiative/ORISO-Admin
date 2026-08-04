import { useTranslation } from 'react-i18next';
import ArrowCircleLeftOutlinedIcon from '@mui/icons-material/ArrowCircleLeftOutlined';
import ArrowCircleUpOutlinedIcon from '@mui/icons-material/ArrowCircleUpOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { CardEditable } from '../../../../CardEditable';
import { FormFileUploaderField } from '../../../../FormFileUploaderField';
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
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="settings.images.title"
            subTitle={t<string>('settings.images.howto')}
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<ImageOutlinedIcon />}
        >
            <div className={styles.assetsLayout}>
                <FormFileUploaderField
                    className={`${styles.assetUploader} ${styles.logoUploader}`}
                    labelKey="organisation.logo"
                    name={['theming', 'logo']}
                    tooltip={t('settings.images.tooltip.logo')}
                    disabled={logoReadOnly}
                />
                <div className={styles.assetMetaColumn}>
                    <div className={styles.assetMeta}>
                        <span className={styles.assetLabel}>
                            <ArrowCircleLeftOutlinedIcon />
                            {t('organisation.logo')}
                        </span>
                        <span className={styles.assetSize}>512x512px</span>
                    </div>
                    <div className={styles.faviconBlock}>
                        <FormFileUploaderField
                            className={`${styles.assetUploader} ${styles.faviconUploader}`}
                            allowIcon
                            labelKey="organisation.favicon"
                            name={['theming', 'favicon']}
                            tooltip={t('settings.images.tooltip.favicon')}
                            disabled={faviconReadOnly}
                        />
                        <div className={styles.assetMetaEnd}>
                            <span className={styles.assetLabel}>
                                {t('organisation.favicon')}
                                <ArrowCircleUpOutlinedIcon />
                            </span>
                            <span className={styles.assetSize}>32x32px</span>
                        </div>
                    </div>
                    {!settings.multitenancyWithSingleDomainEnabled && (
                        <div className={styles.faviconBlock}>
                            <FormFileUploaderField
                                className={`${styles.assetUploader} ${styles.associationLogoUploader}`}
                                labelKey="organisation.associationLogo"
                                name={['theming', 'associationLogo']}
                                tooltip={t('settings.images.tooltip.associationLogo')}
                                disabled={associationLogoReadOnly}
                            />
                            <div className={styles.assetMetaEnd}>
                                <span className={styles.assetLabel}>{t('organisation.associationLogo')}</span>
                                <span className={styles.assetSize}>512x512px</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CardEditable>
    );
};
