import { useTranslation } from 'react-i18next';
import { GdprIcon, ImprintIcon } from '../../CustomIcons/LegalIcons';
import { CardDeck } from '../../CardDeck';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { LegalText } from './components/LegalText';
import { TraegerLegalText } from './components/LegalText/TraegerLegalText';
import { DataProcessingAgreementContainer } from './components/DataProcessingAgreementContainer';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';
import { resolveTenantId } from '../../../utils/resolveTenantId';

interface LegalSettingsProps {
    tenantId?: string | number;
    /** Owner of the server-side drafts, when it differs from the published text's tenant. */
    draftTenantId?: string | number;
}

export const LegalSettings = ({ tenantId, draftTenantId }: LegalSettingsProps) => {
    const { data } = useTenantData();
    const { t } = useTranslation();
    const { isSuperAdmin, isTenantScopedAdmin } = useUserRoles();
    const finalTenantId = resolveTenantId(tenantId, data.id);
    const { settings } = useAppConfigContext();
    const { mutate } = useSettingsAdminMutation();
    // A Träger admin on its own texts receives platform templates and forwards to its Beratungsstellen.
    const isTraegerLevel = !!isTenantScopedAdmin && String(draftTenantId ?? finalTenantId) !== '0';
    const LegalTextCard = isTraegerLevel ? TraegerLegalText : LegalText;

    const LegalTextElement = (
        <LegalTextCard
            tenantId={finalTenantId}
            draftTenantId={draftTenantId}
            fieldName={['content', 'privacy']}
            icon={GdprIcon}
            titleKey="privacy.title"
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
        <CardDeck
            className={styles.cardDeck}
            ariaLabel={t('settings.subhead.legal')}
            previousLabel={t('legal.cardDeck.previous')}
            nextLabel={t('legal.cardDeck.next')}
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
            <CardDeck.Item className={styles.documentEditorItem}>
                <DataProcessingAgreementContainer tenantId={finalTenantId} />
            </CardDeck.Item>
            <CardDeck.Item className={styles.documentEditorItem}>
                <LegalTextCard
                    tenantId={finalTenantId}
                    draftTenantId={draftTenantId}
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
                    cancelLabelKey: 'termsAndConditions.confirmation.cancel',
                    okLabelKey: 'termsAndConditions.confirmation.confirm',
                    field: ['content', 'confirmTermsAndConditions'],
                }}
            /> */}
            <CardDeck.Item className={styles.documentEditorItem}>{LegalTextElement}</CardDeck.Item>
        </CardDeck>
    );
};
