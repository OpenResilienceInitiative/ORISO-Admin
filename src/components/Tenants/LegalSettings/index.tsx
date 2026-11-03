import { GdprIcon, ImprintIcon } from '../../CustomIcons/LegalIcons';
import { CardGrid } from '../../CardGrid';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { LegalManagementCard } from './components/LegalManagementCard';
import { LegalText } from './components/LegalText';
import { legalTextHelp, privacyHelp } from './components/LegalText/help';
import { TraegerLegalText } from './components/LegalText/TraegerLegalText';
import { DataProcessingAgreementContainer } from './components/DataProcessingAgreementContainer';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { resolveTenantId } from '../../../utils/resolveTenantId';

interface LegalSettingsProps {
    tenantId?: string | number;
    /** Owner of the server-side drafts, when it differs from the published text's tenant. */
    draftTenantId?: string | number;
}

export const LegalSettings = ({ tenantId, draftTenantId }: LegalSettingsProps) => {
    const { data } = useTenantData();
    const { isSuperAdmin, isTenantScopedAdmin } = useUserRoles();
    const finalTenantId = resolveTenantId(tenantId, data.id);
    const { settings } = useAppConfigContext();
    const { mutate } = useSettingsAdminMutation();
    // A platform admin inspecting a Träger needs its inbox too; the own platform draft has owner 0.
    const isTraegerLevel = (isTenantScopedAdmin || isSuperAdmin) && String(draftTenantId ?? finalTenantId) !== '0';
    const LegalTextCard = isTraegerLevel ? TraegerLegalText : LegalText;

    const LegalTextElement = (
        <LegalTextCard
            tenantId={finalTenantId}
            draftTenantId={draftTenantId}
            fieldName={['content', 'privacy']}
            icon={GdprIcon}
            titleKey="privacy.title"
            tileHelp={privacyHelp}
            legalType="privacy"
            placeHolderKey="settings.privacy.placeholder"
            showConfirmationModal={{
                titleKey: 'privacy.confirmation.title',
                contentKey: 'privacy.confirmation.content',
                // "Nein" = publish without informing, "Ja" = publish and inform (#1066).
                cancelLabelKey: 'privacy.confirmation.cancel',
                okLabelKey: 'privacy.confirmation.confirm',
                field: ['content', 'confirmPrivacy'],
            }}
        />
    );

    // Never hide modules, only disable them: the settings card, the data
    // processing agreement, the imprint and the privacy statement are always
    // visible in every view; editing stays restricted by permissions.
    return (
        <CardGrid raster>
            {settings?.multitenancyWithSingleDomainEnabled && (
                <CardGrid.Item span={3}>
                    <LegalManagementCard
                        allowEdit={isSuperAdmin}
                        allowed={settings.legalContentChangesBySingleTenantAdminsAllowed}
                        onSave={mutate}
                    />
                </CardGrid.Item>
            )}
            <CardGrid.Item span={3}>
                <DataProcessingAgreementContainer tenantId={finalTenantId} />
            </CardGrid.Item>
            <CardGrid.Item span={3}>
                <LegalTextCard
                    tenantId={finalTenantId}
                    draftTenantId={draftTenantId}
                    fieldName={['content', 'impressum']}
                    titleKey="imprint.title"
                    tileHelp={legalTextHelp}
                    legalType="imprint"
                    icon={ImprintIcon}
                    placeHolderKey="settings.imprint.placeholder"
                />
            </CardGrid.Item>
            {/* <LegalText
                tenantId={finalTenantId}
                fieldName={['content', 'termsAndConditions']}
                titleKey="termsAndConditions.title"
                subTitle={t<string>('termsAndConditions.subTitle')}
                placeHolderKey="settings.termsAndConditions.placeholder"
                showConfirmationModal={{
                    titleKey: 'termsAndConditions.confirmation.title',
                    contentKey: 'termsAndConditions.confirmation.content',
                    cancelLabelKey: 'termsAndConditions.confirmation.cancel',
                    okLabelKey: 'termsAndConditions.confirmation.confirm',
                    field: ['content', 'confirmTermsAndConditions'],
                }}
            /> */}
            <CardGrid.Item span={3}>{LegalTextElement}</CardGrid.Item>
        </CardGrid>
    );
};
