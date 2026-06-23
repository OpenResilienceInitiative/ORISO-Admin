import { useTranslation, Trans } from 'react-i18next';
import { CardDeck } from '../../CardDeck';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { LegalText } from './components/LegalText';
import { DataProcessingAgreement } from './components/DataProcessingAgreement';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { useFeatureContext } from '../../../context/FeatureContext';

interface LegalSettingsProps {
    tenantId?: string | number;
}

export const LegalSettings = ({ tenantId }: LegalSettingsProps) => {
    const { data } = useTenantData();
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const finalTenantId = tenantId || `${data.id}`;
    const { settings } = useAppConfigContext();
    const { isEnabled } = useFeatureContext();
    const { mutate } = useSettingsAdminMutation();

    const LegalTextElement = (
        <LegalText
            tenantId={finalTenantId}
            fieldName={['content', 'privacy']}
            titleKey="privacy.title"
            subTitle={
                <Trans
                    i18nKey="privacy.subTitle"
                    components={{
                        a: <span />,
                    }}
                />
            }
            placeHolderKey="settings.privacy.placeholder"
            showConfirmationModal={{
                titleKey: 'privacy.confirmation.title',
                contentKey: 'privacy.confirmation.content',
                cancelLabelKey: 'privacy.confirmation.confirm',
                okLabelKey: 'privacy.confirmation.cancel',
                field: ['content', 'confirmPrivacy'],
            }}
            placeholders={
                isEnabled(FeatureFlag.CentralDataProtectionTemplate) && {
                    responsible: 'editor.plugin.placeholder.option.responsible.label',
                    dataProtectionOfficer: 'editor.plugin.placeholder.option.dataProtectionOfficer.label',
                }
            }
        />
    );

    // Never hide modules, only disable them: the settings card, the data
    // processing agreement, the imprint and the privacy statement are always
    // visible in every view; editing stays restricted by permissions.
    return (
        <CardDeck
            ariaLabel={t('settings.subhead.legal')}
            previousLabel="Vorherige Rechtskarte anzeigen"
            nextLabel="Weitere Rechtskarte anzeigen"
        >
            {settings?.multitenancyWithSingleDomainEnabled && (
                <CardDeck.Item>
                    <CardEditable
                        key={`legal-toggle-${settings.legalContentChangesBySingleTenantAdminsAllowed}`}
                        allowEdit={isSuperAdmin}
                        initialValues={{ ...settings }}
                        titleKey="tenants.legal.singleTenantsManageLegal.title"
                        variant="dialog"
                        editButtonPlacement="footer"
                        onSave={mutate}
                    >
                        <div className={styles.checkGroup}>
                            <FormSwitchField
                                labelKey="tenants.legal.singleTenantsManageLegal.setting.title"
                                name={['legalContentChangesBySingleTenantAdminsAllowed']}
                                inline
                                disableLabels
                                disabled={!isSuperAdmin}
                            />
                            <p className={styles.checkInfo}>
                                {t('tenants.legal.singleTenantsManageLegal.setting.description')}
                            </p>
                        </div>
                    </CardEditable>
                </CardDeck.Item>
            )}
            <CardDeck.Item>
                <DataProcessingAgreement />
            </CardDeck.Item>
            <CardDeck.Item>
                <LegalText
                    tenantId={finalTenantId}
                    fieldName={['content', 'impressum']}
                    titleKey="imprint.title"
                    subTitle={t<string>('imprint.subTitle')}
                    placeHolderKey="settings.imprint.placeholder"
                />
            </CardDeck.Item>
            {/* <LegalText
                tenantId={finalTenantId}
                fieldName={['content', 'termsAndConditions']}
                titleKey="termsAndConditions.title"
                subTitle={t<string>('termsAndConditions.subTitle')}
                placeHolderKey="settings.termsAndConditions.placeholder"
                showConfirmationModal={{
                    titleKey: 'termsAndConditions.confirmation.title',
                    contentKey: 'termsAndConditions.confirmation.content',
                    cancelLabelKey: 'termsAndConditions.confirmation.confirm',
                    okLabelKey: 'termsAndConditions.confirmation.cancel',
                    field: ['content', 'confirmTermsAndConditions'],
                }}
            /> */}
            <CardDeck.Item>{LegalTextElement}</CardDeck.Item>
        </CardDeck>
    );
};
