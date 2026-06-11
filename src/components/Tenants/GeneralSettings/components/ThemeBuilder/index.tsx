import { Alert, Form, FormInstance } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, BUTTON_TYPES } from '../../../../button/Button';
import { CardEditable } from '../../../../CardEditable';
import { FormColorSelectorField } from '../../../../FormColorSelectorField';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { buildSeedUpdate, readSeeds, TenantSeeds } from '../../../../../utils/themeSeeds';
import { PreviewFrameModal } from './PreviewFrameModal';
import styles from './styles.module.scss';

interface ThemeBuilderProps {
    tenantId: string;
    readOnly?: boolean;
}

interface ThemeBuilderFormProps {
    form: FormInstance;
    storedSeeds: TenantSeeds;
    locks: { primary: boolean; accent: boolean; signal: boolean };
}

const seedIsTooPale = (seeds: TenantSeeds): boolean => {
    if (!seeds.primary) {
        return false;
    }
    try {
        return computeOrisoPalette({ primary: seeds.primary }, 'light').tooPale;
    } catch {
        return false;
    }
};

/**
 * Inner form body — a component (not a render expression) so the antd
 * Form.useWatch hooks are legal: the previews repaint live on every
 * picker change because the watched values recompute the palette.
 */
const ThemeBuilderForm = ({ form, storedSeeds, locks }: ThemeBuilderFormProps) => {
    const { t } = useTranslation();
    const [previewOpen, setPreviewOpen] = useState(false);
    const primary = Form.useWatch(['theming', 'primaryColor'], form);
    const accent = Form.useWatch(['theming', 'accent'], form);
    const signal = Form.useWatch(['theming', 'signal'], form);
    const draftSeeds: TenantSeeds = {
        primary: primary ?? storedSeeds.primary,
        accent: accent ?? storedSeeds.accent,
        signal: signal ?? storedSeeds.signal,
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
                <FormColorSelectorField
                    labelKey="theme.builder.signalColor"
                    name={['theming', 'signal']}
                    disabled={locks.signal}
                />
            </div>
            {tooPale && (
                <Alert className={styles.tooPaleAlert} type="warning" showIcon message={t('theme.builder.tooPale')} />
            )}
            <div className={styles.previewRow}>
                <span className={styles.previewHint}>{t('theme.builder.preview.hint')}</span>
                {/* project Button: not bound to the form's DisabledContext —
                    previewing needs no edit mode */}
                <Button
                    item={{ label: t('theme.builder.preview.open'), type: BUTTON_TYPES.SECONDARY }}
                    buttonHandle={() => setPreviewOpen(true)}
                />
                <PreviewFrameModal
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    draftSeeds={draftSeeds}
                    storedSeeds={storedSeeds}
                />
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
        signal:
            readOnly ||
            isReadOnlySetting(settings.serverSettingsMeta, ['signal', 'theming.signal', 'brandingSignalColor']),
    };

    // A Träger without own seeds inherits the platform seeds (decided
    // 2026-06-10: platform + Träger levels).
    const storedSeeds = readSeeds(data?.theming);
    const inheritedSeeds = readSeeds(inheritedData?.theming);
    const effectiveSeeds: TenantSeeds = {
        primary: storedSeeds.primary || inheritedSeeds.primary,
        accent: storedSeeds.accent || inheritedSeeds.accent,
        signal: storedSeeds.signal || inheritedSeeds.signal,
    };

    const initialValues = {
        theming: {
            primaryColor: effectiveSeeds.primary,
            accent: effectiveSeeds.accent,
            signal: effectiveSeeds.signal,
        },
    };

    const onSubmit = (values) => {
        mutate({
            // Seeds only — the palette is computed on use (UAT-A).
            theming: buildSeedUpdate({
                primary: values.theming?.primaryColor,
                accent: values.theming?.accent,
                signal: values.theming?.signal,
            }),
        });
    };

    return (
        <CardEditable
            key={`theme-builder-${effectiveSeeds.primary}-${locks.primary}-${locks.accent}-${locks.signal}`}
            allowEdit={!(locks.primary && locks.accent && locks.signal)}
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
