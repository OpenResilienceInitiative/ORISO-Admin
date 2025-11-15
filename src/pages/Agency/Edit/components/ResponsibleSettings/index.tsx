import { Col, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import Paragraph from 'antd/lib/typography/Paragraph';
import { Card } from '../../../../../components/Card';
import { FormInputField } from '../../../../../components/FormInputField';

export const ResponsibleSettings = () => {
    const [t] = useTranslation();

    return (
        <Card titleKey="agency.edit.settings.legal.responsible.title">
            <Paragraph className="text desc">{t('agency.edit.settings.legal.responsible.text')}</Paragraph>
            <Row gutter={[20, 10]}>
                <Col xs={12}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'nameAndLegalForm']}
                        labelKey="agency.edit.settings.legal.responsible.identifier"
                        placeholderKey="agency.edit.settings.legal.responsible.identifier"
                        required
                    />
                </Col>
                <Col xs={7}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'postcode']}
                        labelKey="agency.edit.settings.legal.responsible.postcode"
                        placeholderKey="agency.edit.settings.legal.responsible.postcode"
                        required
                        maxLength={5}
                        rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                    />
                </Col>
                <Col xs={5}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'city']}
                        labelKey="agency.edit.settings.legal.responsible.city"
                        placeholderKey="agency.edit.settings.legal.responsible.city"
                        required
                        maxLength={100}
                    />
                </Col>
                <Col xs={7}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'phoneNumber']}
                        labelKey="agency.edit.settings.legal.responsible.phone"
                        placeholderKey="agency.edit.settings.legal.responsible.phone"
                        required
                        maxLength={100}
                    />
                </Col>
                <Col xs={5}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'email']}
                        labelKey="agency.edit.settings.legal.responsible.email"
                        placeholderKey="agency.edit.settings.legal.responsible.email"
                        required
                        maxLength={100}
                    />
                </Col>
            </Row>
        </Card>
    );
};
