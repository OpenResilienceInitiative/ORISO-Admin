import { Alert, Form, FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormColorSelectorField } from '../../../../FormColorSelectorField';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { buildSeedUpdate, readSeeds, TenantSeeds } from '../../../../../utils/themeSeeds';
import { MiniChatPreview } from './MiniChatPreview';
import styles from './styles.module.scss';

interface ThemeBuilderProps {
    tenantId: string;
    readOnly?: boolean;
}

interface ThemeBuilderFormProps {
    form: FormInstance;
    storedSeeds: TenantSeeds;
    locks: { primary: boolean; accent: boolean };
}

const seedIsTooPale = (seeds: TenantSeeds): boolean => {
    if (!seeds.primary) {
        return false;
    }
    return computeOrisoPalette(seeds).tooPale;
};

const ThemeBuilderForm = ({ form, storedSeeds, locks }: ThemeBuilderFormProps) => {
    const { t } = useTranslation();
    const primary = Form.useWatch(['theming', 'primaryColor'], form);
    const accent = Form.useWatch(['theming', 'accent'], form);
    const draftSeeds: TenantSeeds = {
        primary: primary ?? storedSeeds.primary,
        accent: accent ?? storedSeeds.accent,
    };
    const tooPale = seedIsTooPale(draftSeeds);

    return (
        <>
            <div className={styles.seedInputs}>
                <FormColorSelectorField
                    labelKey="theme.builder.primaryColor"
                    name={['theming', 'primaryColor']}
                    required
                    disabled={locks.primary}
                />
                <FormColorSelectorField
                    labelKey="theme.builder.accentColor"
                    name={['theming', 'accent']}
                    disabled={locks.accent}
                />
            </div>
            {tooPale && (
                <Alert className={styles.tooPaleAlert} type="warning" showIcon message={t('theme.builder.tooPale')} />
            )}
            <div className={styles.previewRow}>
                <MiniChatPreview seeds={storedSeeds} labelKey="theme.builder.preview.current" />
                <MiniChatPreview seeds={draftSeeds} labelKey="theme.builder.preview.new" />
            </div>
        </>
    );
};

export const ThemeBuilder = ({ tenantId, readOnly = false }: ThemeBuilderProps) => {
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { data: inheritedData } = usePublicTenantData();
    const { mutate } = useTenantAdminDataMutation({ id: tenantId });

    const locks = {
        primary:
            readOnly ||
            isReadOnlySetting(settings.serverSettingsMeta, [
                'primaryColor',
                'theming.primaryColor',
                'tenantPrimaryColor',
                'tenantThemingPrimaryColor',
                'brandingPrimaryColor',
            ]),
        accent:
            readOnly ||
            isReadOnlySetting(settings.serverSettingsMeta, ['accent', 'theming.accent', 'brandingAccentColor']),
    };
    const storedSeeds = readSeeds(data?.theming);
    const inheritedSeeds = readSeeds(inheritedData?.theming);
    const effectiveSeeds: TenantSeeds = {
        primary: storedSeeds.primary || inheritedSeeds.primary,
        accent: storedSeeds.accent || inheritedSeeds.accent,
    };
    const initialValues = {
        theming: {
            primaryColor: effectiveSeeds.primary,
            accent: effectiveSeeds.accent,
        },
    };
    const onSubmit = (values) => {
        mutate({
            theming: buildSeedUpdate({
                primary: values.theming?.primaryColor,
                accent: values.theming?.accent,
            }),
        });
    };

    return (
        <CardEditable
            key={`theme-builder-${effectiveSeeds.primary}-${effectiveSeeds.accent}-${locks.primary}-${locks.accent}`}
            allowEdit={!(locks.primary && locks.accent)}
            isLoading={isLoading}
            initialValues={initialValues}
            titleKey="theme.builder.title"
            subTitle={t<string>('theme.builder.howto')}
            onSave={onSubmit}
        >
            {({ form }) => <ThemeBuilderForm form={form} storedSeeds={effectiveSeeds} locks={locks} />}
        </CardEditable>
    );
};
