import { useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { M3RichTextEditor } from '../../../../../components/FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../../components/FormPluginEditor/EditorHelpText';
import { GdprIcon, ImprintIcon } from '../../../../../components/CustomIcons/LegalIcons';
import { FeatureFlag } from '../../../../../enums/FeatureFlag';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useFeatureContext } from '../../../../../context/FeatureContext';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { AgencyData } from '../../../../../types/agency';
import styles from './styles.module.scss';

type AgencyLegalTextField = 'impressum' | 'privacy';

interface LegalTextSettingsProps {
    agencyData?: AgencyData;
    field: AgencyLegalTextField;
    onSave: <T>(formData: T, options?: { onError?: () => void }) => void;
    /** Pending state of the agency update mutation — disables publishing while in flight. */
    saving?: boolean;
}

const mergeTranslatedContent = (
    inherited?: Record<string, string>,
    agencyContent?: Record<string, string>,
): Record<string, string> => ({
    ...(inherited || {}),
    ...(agencyContent || {}),
});

/**
 * Agency-level imprint / privacy card in the M3 editor shell. The content starts
 * from the tenant's (Träger) texts with the agency's own overrides on top; local
 * edits are kept per language. Inherited tenant values are rendered but never
 * persisted as agency overrides, so future tenant updates still flow through.
 */
export const LegalTextSettings = ({ agencyData, field, onSave, saving }: LegalTextSettingsProps) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isEnabled } = useFeatureContext();
    const { data: tenantData, isLoading } = useSingleTenantData({
        id: agencyData?.tenantId || '',
        enabled: Boolean(agencyData?.tenantId),
    });
    const isPrivacy = field === 'privacy';
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [edits, setEdits] = useState<Record<string, string>>({});
    const editorIdentity = `${agencyData?.id ?? ''}:${field}`;
    const agencyOverrides = useMemo(() => agencyData?.content?.[field] || {}, [agencyData, field]);

    const languages = useMemo(() => {
        const configured = tenantData?.settings?.activeLanguages;
        return configured?.length ? configured : ['de'];
    }, [tenantData?.settings?.activeLanguages]);

    useEffect(() => {
        setEdits({});
        setActiveLanguage('de');
    }, [editorIdentity]);

    // The initial 'de' can be unavailable once the tenant's languages arrive; fall
    // back to the first configured language so the editor never sits on an empty one.
    useEffect(() => {
        if (!languages.includes(activeLanguage)) {
            setActiveLanguage(languages[0]);
        }
    }, [languages, activeLanguage]);

    // Inherited tenant texts with the agency's overrides on top, plus the local edits.
    const contentByLanguage = useMemo<Record<string, string>>(
        () => ({
            ...mergeTranslatedContent(tenantData?.content?.[field], agencyOverrides),
            ...edits,
        }),
        [agencyOverrides, edits, field, tenantData],
    );

    const onPublish = () => {
        // Preserve untouched agency overrides, but do not materialize inherited
        // tenant values as local copies.
        onSave({ content: { [field]: { ...agencyOverrides, ...edits } } });
    };

    if (isLoading) {
        return (
            <div className={styles.card}>
                <Spin />
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <M3RichTextEditor
                title={t(`agency.edit.settings.legal.${field}.title`)}
                icon={isPrivacy ? GdprIcon : ImprintIcon}
                readOnly={!canEditLegalText}
                publishing={saving}
                versionLabel={t('legal.m3Editor.versionLabel')}
                languages={languages.map((language) => ({
                    value: language,
                    label: t(`language.${language}`),
                }))}
                language={activeLanguage}
                onLanguageChange={setActiveLanguage}
                helpSlot={<EditorHelpText text={t(`agency.edit.settings.legal.${field}.subtitle`)} />}
                placeholder={t(`agency.edit.settings.legal.${field}.placeholder`)}
                placeholders={
                    isPrivacy && isEnabled(FeatureFlag.CentralDataProtectionTemplate)
                        ? {
                              responsible: 'editor.plugin.placeholder.option.responsible.label',
                              dataProtectionOfficer: 'editor.plugin.placeholder.option.dataProtectionOfficer.label',
                          }
                        : undefined
                }
                value={contentByLanguage[activeLanguage] ?? ''}
                onChange={
                    canEditLegalText
                        ? (html) => setEdits((current) => ({ ...current, [activeLanguage]: html }))
                        : undefined
                }
                onPublish={canEditLegalText ? onPublish : undefined}
            />
        </div>
    );
};
