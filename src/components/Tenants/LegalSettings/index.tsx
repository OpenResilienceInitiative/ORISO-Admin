import { useTranslation } from 'react-i18next';
import { GdprIcon, ImprintIcon } from '../../CustomIcons/LegalIcons';
import { CardDeck } from '../../CardDeck';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { LegalText } from './components/LegalText';
import { DataProcessingAgreementContainer } from './components/DataProcessingAgreementContainer';
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
            icon={GdprIcon}
            titleKey="privacy.title"
            legalType="privacy"
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
            previousLabel={t('legal.cardDeck.previous')}
            nextLabel={t('legal.cardDeck.next')}
        >
            {settings?.multitenancyWithSingleDomainEnabled && (
                <CardDeck.Item >
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
                            <p className={styles.checkInfo}>
                                {t('tenants.legal.singleTenantsManageLegal.setting.description')}
                            </p>
                            <FormSwitchField
                                labelKey="tenants.legal.singleTenantsManageLegal.setting.title"
                                name={['legalContentChangesBySingleTenantAdminsAllowed']}
                                inline
                                disableLabels
                                disabled={!isSuperAdmin}
                            />
                        </div>
                    </CardEditable>
                </CardDeck.Item>
            )}
            <CardDeck.Item className={styles.cardDeckItem}>
                <DataProcessingAgreementContainer tenantId={finalTenantId} />
            </CardDeck.Item>
            <CardDeck.Item className={styles.cardDeckItem}>
                <LegalText
                    tenantId={finalTenantId}
                    fieldName={['content', 'impressum']}
                    titleKey="imprint.title"
                    legalType="imprint"
                    icon={ImprintIcon}
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
            <CardDeck.Item className={styles.cardDeckItem}>{LegalTextElement}</CardDeck.Item>
        </CardDeck>
    );
};
