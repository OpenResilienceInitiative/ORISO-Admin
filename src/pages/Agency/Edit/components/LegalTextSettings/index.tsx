import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../../components/CardEditable';
import FormPluginEditor from '../../../../../components/FormPluginEditor/FormPluginEditor';
import { TranslatableFormField } from '../../../../../components/TranslatableFormField';
import { FeatureFlag } from '../../../../../enums/FeatureFlag';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useFeatureContext } from '../../../../../context/FeatureContext';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { AgencyData } from '../../../../../types/agency';

type AgencyLegalTextField = 'impressum' | 'privacy';

interface LegalTextSettingsProps {
    agencyData?: AgencyData;
    field: AgencyLegalTextField;
    initialValues?: Record<string, unknown>;
    onSave: <T>(formData: T, options?: { onError?: () => void }) => void;
}

const mergeTranslatedContent = (
    inherited?: Record<string, string>,
    agencyContent?: Record<string, string>,
): Record<string, string> => ({
    ...(inherited || {}),
    ...(agencyContent || {}),
});

export const LegalTextSettings = ({ agencyData, field, initialValues, onSave }: LegalTextSettingsProps) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isEnabled } = useFeatureContext();
    const { data: tenantData, isLoading } = useSingleTenantData({
        id: agencyData?.tenantId || '',
        enabled: Boolean(agencyData?.tenantId),
    });
    const isPrivacy = field === 'privacy';
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);

    const inheritedInitialValues = useMemo(
        () => ({
            ...(initialValues || {}),
            content: {
                ...((tenantData?.content as Record<string, unknown>) || {}),
                ...((agencyData?.content as Record<string, unknown>) || {}),
                [field]: mergeTranslatedContent(tenantData?.content?.[field], agencyData?.content?.[field]),
            },
        }),
        [agencyData, field, initialValues, tenantData],
    );

    return (
        <CardEditable
            key={`agency-legal-text-${field}-${agencyData?.id || 'new'}-${tenantData?.id || 'tenant'}`}
            allowUnsavedChanges
            allowEdit={canEditLegalText}
            initialValues={inheritedInitialValues}
            isLoading={isLoading}
            titleKey={`agency.edit.settings.legal.${field}.title`}
            subTitle={t<string>(`agency.edit.settings.legal.${field}.subtitle`)}
            variant="dialog"
            editButtonPlacement="footer"
            onSave={onSave}
        >
            <TranslatableFormField name={['content', field]}>
                <FormPluginEditor
                    placeholder={t(`agency.edit.settings.legal.${field}.placeholder`)}
                    placeholders={
                        isPrivacy && isEnabled(FeatureFlag.CentralDataProtectionTemplate)
                            ? {
                                  responsible: 'editor.plugin.placeholder.option.responsible.label',
                                  dataProtectionOfficer: 'editor.plugin.placeholder.option.dataProtectionOfficer.label',
                              }
                            : undefined
                    }
                    // Legal texts are optional (no required rule).
                    itemProps={{}}
                />
            </TranslatableFormField>
        </CardEditable>
    );
};
