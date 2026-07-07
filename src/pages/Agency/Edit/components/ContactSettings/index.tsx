import { Col, Form, FormInstance, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import Paragraph from 'antd/lib/typography/Paragraph';
import { useMemo } from 'react';
import { Card } from '../../../../../components/Card';
import { FormInputField } from '../../../../../components/FormInputField';
import styles from '../RegistrationSettings/styles.module.scss';
import { FormRadioGroupField } from '../../../../../components/FormRadioGroupField';
import { CardEditable } from '../../../../../components/CardEditable';

interface ContactSettingsProps {
    initialValues?: Record<string, unknown>;
    onSave?: <T>(formData: T, options?: { onError?: () => void }) => void;
    type?: any;
}

const ContactSettingsFields = ({ form, type }: { form?: FormInstance; type?: any }) => {
    const { t } = useTranslation();
    const watchedType = Form.useWatch(['dataProtection', 'dataProtectionResponsibleEntity'], form);
    const finalType = watchedType || type;
    const contactKey = useMemo(() => {
        if (!finalType || finalType === 'AGENCY_RESPONSIBLE') {
            return null;
        }
        return finalType === 'DATA_PROTECTION_OFFICER'
            ? 'dataProtectionOfficerContact'
            : 'alternativeDataProtectionRepresentativeContact';
    }, [finalType]);

    return (
        <>
            <Paragraph className="text desc">{t('agency.edit.settings.legal.contact.text')}</Paragraph>

            <FormRadioGroupField
                required
                className={styles.radioGroup}
                vertical
                name={['dataProtection', 'dataProtectionResponsibleEntity']}
                labelKey="agency.edit.settings.legal.contact.type.title"
            >
                <FormRadioGroupField.Radio value="DATA_PROTECTION_OFFICER">
                    {t('agency.edit.settings.legal.contact.type.data_protection_officer')}
                </FormRadioGroupField.Radio>
                <FormRadioGroupField.Radio value="ALTERNATIVE_REPRESENTATIVE">
                    {t('agency.edit.settings.legal.contact.type.alternative_representative')}
                </FormRadioGroupField.Radio>
                <FormRadioGroupField.Radio value="AGENCY_RESPONSIBLE">
                    {t('agency.edit.settings.legal.contact.type.agency_responsible')}
                </FormRadioGroupField.Radio>
            </FormRadioGroupField>

            {contactKey && (
                <Row gutter={[20, 10]}>
                    <Col xs={24}>
                        <FormInputField
                            name={['dataProtection', contactKey, 'nameAndLegalForm']}
                            labelKey="agency.edit.settings.legal.contact.name"
                            placeholderKey="agency.edit.settings.legal.contact.name"
                            required
                        />
                    </Col>
                    <Col xs={14}>
                        <FormInputField
                            name={['dataProtection', contactKey, 'postcode']}
                            labelKey="agency.edit.settings.legal.contact.postcode"
                            placeholderKey="agency.edit.settings.legal.contact.postcode"
                            required
                            maxLength={5}
                            rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                        />
                    </Col>
                    <Col xs={10}>
                        <FormInputField
                            name={['dataProtection', contactKey, 'city']}
                            labelKey="agency.edit.settings.legal.contact.city"
                            placeholderKey="agency.edit.settings.legal.contact.city"
                            required
                            maxLength={100}
                        />
                    </Col>
                    <Col xs={14}>
                        <FormInputField
                            name={['dataProtection', contactKey, 'phoneNumber']}
                            labelKey="agency.edit.settings.legal.contact.phone"
                            placeholderKey="agency.edit.settings.legal.contact.phone"
                            required
                            maxLength={100}
                        />
                    </Col>
                    <Col xs={10}>
                        <FormInputField
                            name={['dataProtection', contactKey, 'email']}
                            labelKey="agency.edit.settings.legal.contact.email"
                            placeholderKey="agency.edit.settings.legal.contact.email"
                            required
                            maxLength={100}
                        />
                    </Col>
                </Row>
            )}
        </>
    );
};

export const ContactSettings = ({ initialValues, onSave, type }: ContactSettingsProps) => {
    if (onSave) {
        return (
            <CardEditable
                allowUnsavedChanges
                initialValues={initialValues}
                titleKey="agency.edit.settings.legal.contact.title"
                variant="dialog"
                editButtonPlacement="footer"
                onSave={onSave}
            >
                {({ form }) => <ContactSettingsFields form={form} type={type} />}
            </CardEditable>
        );
    }

    return (
        <Card titleKey="agency.edit.settings.legal.contact.title" variant="dialog">
            <ContactSettingsFields type={type} />
        </Card>
    );
};
