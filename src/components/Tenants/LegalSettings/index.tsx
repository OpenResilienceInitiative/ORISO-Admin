/* eslint-disable jsx-a11y/anchor-has-content */
import { Col, Row } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { LegalText } from './components/LegalText';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { UserRole } from '../../../enums/UserRole';
import styles from './styles.module.scss';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { useFeatureContext } from '../../../context/FeatureContext';

interface LegalSettingsProps {
    tenantId?: string | number;
    disableManageToggle?: boolean;
}

export const LegalSettings = ({ tenantId, disableManageToggle }: LegalSettingsProps) => {
    const { data } = useTenantData();
    const { t } = useTranslation();
    const { hasRole } = useUserRoles();
    const finalTenantId = tenantId || `${data.id}`;
    const { settings } = useAppConfigContext();
    const { isEnabled } = useFeatureContext();
    const { mutate } = useSettingsAdminMutation();
    const canShowExtraTexts =
        (settings?.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin) && !disableManageToggle) ||
        !settings?.multitenancyWithSingleDomainEnabled;

    const LegalTextElement = (
        <LegalText
            tenantId={finalTenantId}
            fieldName={['content', 'privacy']}
            titleKey="privacy.title"
            subTitle={
                <Trans
                    i18nKey="privacy.subTitle"
                    components={{
                        a: (
                            <a
                                href="https://www.caritas-beratungundhilfe.de/datenschutz"
                                target="_blank"
                                rel="noreferrer"
                            />
                        ),
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

    if (!canShowExtraTexts) {
        return (
            <Row gutter={[24, 24]}>
                <Col span={12} sm={6}>
                    {LegalTextElement}
                </Col>
            </Row>
        );
    }

    return (
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                {!disableManageToggle &&
                    settings?.multitenancyWithSingleDomainEnabled &&
                    hasRole(UserRole.TenantAdmin) && (
                        <CardEditable
                            initialValues={{ ...settings }}
                            titleKey="tenants.legal.singleTenantsManageLegal.title"
                            onSave={mutate}
                        >
                            <div className={styles.checkGroup}>
                                <FormSwitchField
                                    labelKey="tenants.legal.singleTenantsManageLegal.setting.title"
                                    name={['legalContentChangesBySingleTenantAdminsAllowed']}
                                    inline
                                    disableLabels
                                />
                                <p className={styles.checkInfo}>
                                    {t('tenants.legal.singleTenantsManageLegal.setting.description')}
                                </p>
                            </div>
                        </CardEditable>
                    )}
                <LegalText
                    tenantId={finalTenantId}
                    fieldName={['content', 'impressum']}
                    titleKey="imprint.title"
                    subTitle={t<string>('imprint.subTitle')}
                    placeHolderKey="settings.imprint.placeholder"
                />
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
            </Col>
            <Col span={12} sm={6}>
                {LegalTextElement}
            </Col>
        </Row>
    );
};
